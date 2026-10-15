import { access } from "node:fs/promises";
import nodePath from "node:path";
import { ValidationError } from "@cliffy/command";
import { unrecognized } from "@openrouter/sdk/types";

import { NO_RETRIES } from "$constants/request-options";
import { toApiError } from "$errors/to-api-error";
import { createUlid } from "$history/ulid";
import { removeControlCharacters } from "$utilities/text-utilities";

import { consumeImageStreamAsync } from "./image-stream";
import { InterruptPhase } from "./interrupt-guard";
import { getOutputPath, OutputKind, parseOutputSpec } from "./output-paths";
import { toDataUrl } from "./references";
import { saveRunAsync } from "./save-run";
import { validateRequest } from "./validate-request";

import type { RequestOptions } from "@openrouter/sdk/lib/sdks.js";
import type { ImageGenerationRequest, ImageModelListItem } from "@openrouter/sdk/models";
import type { CreateImagesRequest, CreateImagesResponse } from "@openrouter/sdk/models/operations";
import type { Unrecognized } from "@openrouter/sdk/types";

import type { StreamProgress } from "./image-stream";
import type { InterruptGuard } from "./interrupt-guard";
import type { OutputSpec } from "./output-paths";
import type { ReferenceImage } from "./references";
import type { GeneratedImage, SaveDependencies, SavedImage, SaveFailure } from "./save-run";
import type { GenerationOptions, ResolvedParameters } from "./validate-request";

/** The one SDK method darkroom spends money through. */
export interface ImagesClient {
	generate(request: CreateImagesRequest, options?: RequestOptions): Promise<CreateImagesResponse>;
}

export interface ImagesResponse {
	readonly cost?: number | undefined;
	/** The provider's error, when a stream ended with one after some images. */
	readonly error?: string | undefined;
	readonly images: ReadonlyArray<GeneratedImage>;
}

function isStreamResponse(
	response: CreateImagesResponse,
): response is Exclude<CreateImagesResponse, { data: unknown }> {
	return !("data" in response);
}

function ignoreProgress(): void {
	// Used when the caller did not ask for progress.
}

/**
 * Sends one image request. It is never retried: a retry after the provider
 * has produced an image could bill it twice.
 *
 * @param client - `openrouter.images`, or a fake in tests.
 * @param request - The request body.
 * @param signal - Aborts the request on Ctrl-C.
 * @param onProgress - When given, the request is streamed and this receives
 *   progress; otherwise the response arrives all at once.
 * @returns The images and their total cost, when reported.
 * @rejects An `ApiError` or `InterruptedError` describing the failure, which
 *   notes when the request may already have been charged.
 */
export async function requestImagesAsync(
	client: ImagesClient,
	request: ImageGenerationRequest,
	signal: AbortSignal,
	onProgress?: (progress: StreamProgress) => void,
): Promise<ImagesResponse> {
	const imageGenerationRequest = onProgress === undefined ? request : { ...request, stream: true };
	try {
		const response = await client.generate({ imageGenerationRequest }, { retries: NO_RETRIES, signal });
		if (isStreamResponse(response)) {
			return await consumeImageStreamAsync(response, onProgress ?? ignoreProgress);
		}

		return { cost: response.usage?.cost ?? undefined, images: response.data };
	} catch (error) {
		throw error instanceof Error ? toApiError(error, true) : error;
	}
}

export interface GenerationInput {
	/** The comparison this run belongs to, for `compare`. */
	readonly batch?: string | undefined;
	/** Overwrite an explicit `-o` file. */
	readonly force: boolean;
	readonly modelId: string;
	readonly options: GenerationOptions;
	/** Names generated files `<stem>_N` instead of `<date>_<slug>_N`. */
	readonly outputStem?: string | undefined;
	/** The run this one repeats, for `history rerun`. */
	readonly parent?: string | undefined;
	readonly prompt: string;
	readonly references: ReadonlyArray<ReferenceImage>;
	/** The app session this run belongs to. */
	readonly session?: string | undefined;
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
function toOpenEnum(value?: string): undefined | Unrecognized<string> {
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
	if (force || spec.kind !== OutputKind.File || nodePath.extname(spec.path).length === 0) return;

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
 * @param rawInput - What to generate, as given; the prompt is cleaned here.
 * @param environment - The model list and the terminal state.
 * @returns The request to send and where the images will go.
 * @rejects A `ValidationError` for anything the model can't serve, or an
 *   explicit `-o` file that already exists.
 */
export async function prepareGenerationAsync(
	rawInput: GenerationInput,
	environment: GenerationEnvironment,
): Promise<PreparedGeneration> {
	// Typed prompts can carry control characters (Ctrl-A, Ctrl-E); they would
	// reach the model, the file name, and the history.
	const input = { ...rawInput, prompt: removeControlCharacters(rawInput.prompt).trim() };
	if (input.prompt.length === 0) {
		throw new ValidationError("The prompt is empty.");
	}

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
	const parsedSpec = parseOutputSpec(output, environment.cwd, isDirectory);
	const outputSpec =
		parsedSpec.kind === OutputKind.Directory && input.outputStem !== undefined
			? { ...parsedSpec, stem: input.outputStem }
			: parsedSpec;
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

export interface GenerationResult {
	readonly id: string;
	readonly cost?: number | undefined;
	readonly created: string;
	readonly failures: ReadonlyArray<SaveFailure>;
	readonly images: ReadonlyArray<SavedImage>;
	readonly model: string;
	readonly prompt: string;
	/**
	 * The provider's error, when a stream stopped early. The images it did
	 * finish are saved.
	 */
	readonly providerError?: string | undefined;
	readonly requested: number;
	readonly returned: number;
}

export interface ExecutionDependencies extends SaveDependencies {
	readonly client: ImagesClient;
	readonly guard: InterruptGuard;
	readonly now: () => Date;
	/** Receives streaming progress. Only used when the model can stream. */
	readonly onProgress?: ((progress: StreamProgress) => void) | undefined;
}

/**
 * Sends the prepared request and saves every image that comes back.
 *
 * @param prepared - From `prepareGenerationAsync`.
 * @param dependencies - The API client, clock, history, and output streams.
 * @returns What was generated and where it went.
 * @rejects An `ApiError` or `InterruptedError` when the request fails.
 */
export async function executeGenerationAsync(
	prepared: PreparedGeneration,
	dependencies: ExecutionDependencies,
): Promise<GenerationResult> {
	const { guard } = dependencies;
	const createdAt = dependencies.now();
	const id = createUlid(createdAt.getTime());

	guard.enter(InterruptPhase.Requesting);
	const onProgress = prepared.model.supportsStreaming ? dependencies.onProgress : undefined;
	const response = await requestImagesAsync(dependencies.client, prepared.request, guard.signal, onProgress);
	guard.enter(InterruptPhase.Saving);

	const requested = prepared.parameters.count;
	const returned = response.images.length;
	if (returned < requested) {
		dependencies.warn(`Asked for ${requested} images, got ${returned}.`);
	}

	const { failures, images } = await saveRunAsync(
		{ id, cost: response.cost, createdAt, images: response.images, prepared },
		dependencies,
	);

	guard.enter(InterruptPhase.Idle);
	return {
		id,
		cost: response.cost,
		created: createdAt.toISOString(),
		failures,
		images,
		model: prepared.model.id,
		prompt: prepared.input.prompt,
		providerError: response.error,
		requested,
		returned,
	};
}
