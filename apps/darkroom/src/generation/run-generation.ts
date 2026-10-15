import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { ValidationError } from "@cliffy/command";
import { unrecognized } from "@openrouter/sdk/types";

import { NO_RETRIES } from "$constants/request-options";
import { ApiError } from "$errors/api-error";
import { CHARGE_NOTE, toApiError } from "$errors/to-api-error";
import { createUlid } from "$history/ulid";
import { writeFileAtomicAsync, writeFileNoClobberAsync } from "$utilities/atomic-write";

import { InterruptPhase } from "./interrupt-guard";
import { getExtensionForMediaType, getMediaTypeForImageType, sniffMediaType } from "./media-types";
import { formatLocalDate, getOutputPath, OutputKind, parseOutputSpec, slugify } from "./output-paths";
import { toDataUrl } from "./references";
import { validateRequest } from "./validate-request";

import type { RequestOptions } from "@openrouter/sdk/lib/sdks.js";
import type { ImageGenerationRequest, ImageModelListItem } from "@openrouter/sdk/models";
import type { CreateImagesRequest, CreateImagesResponse } from "@openrouter/sdk/models/operations";
import type { Unrecognized } from "@openrouter/sdk/types";

import type { InterruptGuard } from "./interrupt-guard";
import type { OutputSpec } from "./output-paths";
import type { ReferenceImage } from "./references";
import type { GenerationOptions, ResolvedParameters } from "./validate-request";

/** The one SDK method darkroom spends money through. */
export interface ImagesClient {
	generate(request: CreateImagesRequest, options?: RequestOptions): Promise<CreateImagesResponse>;
}

export interface GeneratedImage {
	readonly b64Json: string;
	readonly mediaType?: string | undefined;
}

export interface ImagesResponse {
	readonly cost?: number | undefined;
	readonly images: ReadonlyArray<GeneratedImage>;
}

function isStreamResponse(
	response: CreateImagesResponse,
): response is Exclude<CreateImagesResponse, { data: unknown }> {
	return !("data" in response);
}

async function collectStreamAsync(stream: Exclude<CreateImagesResponse, { data: unknown }>): Promise<ImagesResponse> {
	const images: Array<GeneratedImage> = [];
	let cost: number | undefined;
	for await (const event of stream) {
		if (event.type === "image_generation.completed") {
			images.push({ b64Json: event.b64Json, mediaType: event.mediaType });
			const eventCost = event.usage?.cost ?? undefined;
			if (eventCost !== undefined) cost = (cost ?? 0) + eventCost;
		} else if (event.type === "error") {
			throw new ApiError(`The provider reported an error mid-stream: ${event.error.message} ${CHARGE_NOTE}`);
		}
	}
	return { cost, images };
}

/**
 * Sends one image request. It is never retried: a retry after the provider
 * has produced an image could bill it twice.
 *
 * @param client - `openrouter.images`, or a fake in tests.
 * @param request - The request body.
 * @param signal - Aborts the request on Ctrl-C.
 * @returns The images and their total cost, when reported.
 * @rejects An `ApiError` or `InterruptedError` describing the failure, which
 *   notes when the request may already have been charged.
 */
export async function requestImagesAsync(
	client: ImagesClient,
	request: ImageGenerationRequest,
	signal: AbortSignal,
): Promise<ImagesResponse> {
	try {
		const response = await client.generate({ imageGenerationRequest: request }, { retries: NO_RETRIES, signal });
		if (isStreamResponse(response)) return await collectStreamAsync(response);
		return { cost: response.usage?.cost ?? undefined, images: response.data };
	} catch (error) {
		throw error instanceof Error ? toApiError(error, true) : error;
	}
}

export interface GenerationInput {
	/** Overwrite an explicit `-o` file. */
	readonly force: boolean;
	readonly modelId: string;
	readonly options: GenerationOptions;
	readonly prompt: string;
	readonly references: ReadonlyArray<ReferenceImage>;
}

export interface GenerationEnvironment {
	readonly cwd: string;
	isDirectoryAsync(path: string): Promise<boolean>;
	readonly models: ReadonlyArray<ImageModelListItem>;
	readonly stdoutIsTty: boolean;
}

export interface PreparedGeneration {
	readonly input: GenerationInput;
	readonly model: ImageModelListItem;
	readonly outputSpec: OutputSpec;
	readonly parameters: ResolvedParameters;
	readonly request: ImageGenerationRequest;
	readonly warnings: ReadonlyArray<string>;
}

/**
 * The SDK types these fields as its own literal unions, but models declare
 * their own values, which darkroom has already validated.
 *
 * @param value - A validated value.
 * @returns The value, typed for the SDK.
 */
function toOpenEnum(value: string | undefined): undefined | Unrecognized<string> {
	return value === undefined ? undefined : unrecognized(value);
}

function toRequest(
	modelId: string,
	prompt: string,
	parameters: ResolvedParameters,
	references: ReadonlyArray<ReferenceImage>,
): ImageGenerationRequest {
	return {
		aspectRatio: toOpenEnum(parameters.aspectRatio),
		background: toOpenEnum(parameters.background),
		inputReferences:
			references.length === 0
				? undefined
				: references.map((reference) => ({ imageUrl: { url: toDataUrl(reference) }, type: "image_url" })),
		model: modelId,
		// oxlint-disable-next-line id-length -- the API calls this field n
		n: parameters.count,
		outputCompression: parameters.outputCompression,
		outputFormat: parameters.outputFormat,
		prompt,
		quality: toOpenEnum(parameters.quality),
		resolution: toOpenEnum(parameters.resolution),
		seed: parameters.seed,
	};
}

async function existsAsync(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function checkExplicitOutputAsync(spec: OutputSpec, count: number, force: boolean): Promise<void> {
	if (force || spec.kind !== OutputKind.File || nodePath.extname(spec.path) === "") return;

	const paths = Array.from({ length: count }, (_, index) =>
		getOutputPath(spec, { count, date: "", extension: "", index: index + 1, slug: "" }),
	);
	const existing = await Promise.all(paths.map(async (path) => ((await existsAsync(path)) ? path : undefined)));
	const first = existing.find((path) => path !== undefined);
	if (first !== undefined) throw new ValidationError(`${first} already exists. Pass --force to overwrite it.`);
}

/**
 * Resolves the model and validates everything that can be checked before
 * spending money.
 *
 * @param input - What to generate.
 * @param environment - The model list and the terminal state.
 * @returns The request to send and where the images will go.
 * @rejects A `ValidationError` for anything the model can't serve, or an
 *   explicit `-o` file that already exists.
 */
export async function prepareGenerationAsync(
	input: GenerationInput,
	environment: GenerationEnvironment,
): Promise<PreparedGeneration> {
	const model = environment.models.find((item) => item.id === input.modelId);
	if (model === undefined) {
		throw new ValidationError(`Unknown model "${input.modelId}". Run \`darkroom models list\` to see the options.`);
	}

	const { parameters, warnings } = validateRequest(input.options, {
		model,
		referenceCount: input.references.length,
		stdoutIsTty: environment.stdoutIsTty,
	});

	const { output } = input.options;
	const isDirectory = output !== undefined && output !== "-" && (await environment.isDirectoryAsync(output));
	const outputSpec = parseOutputSpec(output, environment.cwd, isDirectory);
	await checkExplicitOutputAsync(outputSpec, parameters.count, input.force);

	return {
		input,
		model,
		outputSpec,
		parameters,
		request: toRequest(model.id, input.prompt, parameters, input.references),
		warnings,
	};
}

export interface SavedImage {
	readonly mediaType: string;
	/** Where the image was written, or `undefined` for stdout. */
	readonly path: string | undefined;
}

export interface SaveFailure {
	readonly message: string;
	readonly recoveredPath: string;
}

export interface GenerationResult {
	readonly id: string;
	readonly cost?: number | undefined;
	readonly created: string;
	readonly failures: ReadonlyArray<SaveFailure>;
	readonly images: ReadonlyArray<SavedImage>;
	readonly model: string;
	readonly prompt: string;
	readonly requested: number;
	readonly returned: number;
}

export interface ExecutionDependencies {
	readonly client: ImagesClient;
	readonly guard: InterruptGuard;
	readonly now: () => Date;
	warn(message: string): void;
	writeStdoutAsync(bytes: Uint8Array): Promise<void>;
}

interface DecodedImage {
	readonly bytes: Uint8Array;
	readonly mediaType: string;
}

function decodeImage(image: GeneratedImage, prepared: PreparedGeneration): DecodedImage {
	const bytes = new Uint8Array(Buffer.from(image.b64Json, "base64"));
	const { outputFormat } = prepared.parameters;
	const mediaType =
		image.mediaType ??
		sniffMediaType(bytes) ??
		(outputFormat === undefined ? "image/png" : getMediaTypeForImageType(outputFormat));
	return { bytes, mediaType };
}

interface SaveContext {
	readonly id: string;
	readonly date: string;
	readonly dependencies: ExecutionDependencies;
	readonly prepared: PreparedGeneration;
	readonly slug: string;
}

async function writeToOutputAsync(
	context: SaveContext,
	bytes: Uint8Array,
	extension: string,
	index: number,
	count: number,
): Promise<string | undefined> {
	const { dependencies, prepared } = context;
	const spec = prepared.outputSpec;
	if (spec.kind === OutputKind.Stdout) {
		await dependencies.writeStdoutAsync(bytes);
		return undefined;
	}

	const planned = getOutputPath(spec, { count, date: context.date, extension, index, slug: context.slug });
	if (prepared.input.force && spec.kind === OutputKind.File) return writeFileAtomicAsync(planned, bytes);

	const written = await writeFileNoClobberAsync(planned, bytes);
	if (written !== planned && spec.kind === OutputKind.File) {
		dependencies.warn(`${planned} appeared while generating; saved as ${written} instead.`);
	}
	return written;
}

async function saveImageAsync(
	context: SaveContext,
	image: GeneratedImage,
	index: number,
	count: number,
): Promise<{ failure?: SaveFailure; saved: SavedImage }> {
	const { bytes, mediaType } = decodeImage(image, context.prepared);
	const extension = getExtensionForMediaType(mediaType);
	try {
		const path = await writeToOutputAsync(context, bytes, extension, index, count);
		return { saved: { mediaType, path } };
	} catch (error) {
		const recoveryPath = nodePath.join(tmpdir(), `darkroom-recovered-${context.id}`, `${index}.${extension}`);
		const recoveredPath = await writeFileNoClobberAsync(recoveryPath, bytes);
		const message = error instanceof Error ? error.message : String(error);
		return { failure: { message, recoveredPath }, saved: { mediaType, path: recoveredPath } };
	}
}

/**
 * Sends the prepared request and saves every image that comes back.
 *
 * Saving never loses a paid image: a write that fails falls back to a
 * recovery folder in the system temp directory, and the failure is reported
 * instead of thrown.
 *
 * @param prepared - From `prepareGenerationAsync`.
 * @param dependencies - The API client, clock, and output streams.
 * @returns What was generated and where it went.
 */
export async function executeGenerationAsync(
	prepared: PreparedGeneration,
	dependencies: ExecutionDependencies,
): Promise<GenerationResult> {
	const { guard } = dependencies;
	const startedAt = dependencies.now();
	const id = createUlid(startedAt.getTime());

	guard.enter(InterruptPhase.Requesting);
	const response = await requestImagesAsync(dependencies.client, prepared.request, guard.signal);
	guard.enter(InterruptPhase.Saving);

	const requested = prepared.parameters.count;
	const returned = response.images.length;
	if (returned < requested) dependencies.warn(`Asked for ${requested} images, got ${returned}.`);

	const context: SaveContext = {
		id,
		date: formatLocalDate(startedAt),
		dependencies,
		prepared,
		slug: slugify(prepared.input.prompt),
	};
	const images: Array<SavedImage> = [];
	const failures: Array<SaveFailure> = [];
	for (const [index, image] of response.images.entries()) {
		// oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- sequential writes keep numbering predictable
		const { failure, saved } = await saveImageAsync(context, image, index + 1, returned);
		images.push(saved);
		if (failure !== undefined) failures.push(failure);
	}

	guard.enter(InterruptPhase.Idle);
	return {
		id,
		cost: response.cost,
		created: startedAt.toISOString(),
		failures,
		images,
		model: prepared.model.id,
		prompt: prepared.input.prompt,
		requested,
		returned,
	};
}
