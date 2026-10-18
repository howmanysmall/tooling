import { tmpdir } from "node:os";
import nodePath from "node:path";

import { appendAsync, resolve, storeFilesAsync } from "$history/history-store";
import { writeFileAtomicAsync, writeFileNoClobberAsync } from "$utilities/atomic-write";

import { getExtensionForMediaType, getMediaTypeForImageType, sniffMediaType } from "./media-types";
import { formatLocalDate, getOutputPath, OutputKind, slugify } from "./output-paths";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { PreparedGeneration } from "./run-generation";

export interface GeneratedImage {
	readonly b64Json: string;
	readonly mediaType?: string | undefined;
}

export interface SavedImage {
	readonly mediaType: string;
	/** Where the image was written, or `undefined` for stdout. */
	readonly path: string | undefined;
}

export interface SaveFailure {
	readonly message: string;
	/** Where the image can be found instead. */
	readonly recoveredPath: string;
}

export interface RunToSave {
	readonly id: string;
	readonly cost?: number | undefined;
	readonly createdAt: Date;
	readonly images: ReadonlyArray<GeneratedImage>;
	readonly prepared: PreparedGeneration;
}

export interface SaveDependencies {
	/** Where to copy the run. Omitted in tests that don't need history. */
	readonly history?: HistoryStore | undefined;
	warn(message: string): void;
	writeStdoutAsync(bytes: Uint8Array): Promise<void>;
}

export interface SaveOutcome {
	readonly failures: ReadonlyArray<SaveFailure>;
	readonly images: ReadonlyArray<SavedImage>;
}

interface DecodedImage {
	readonly bytes: Uint8Array;
	readonly extension: string;
	readonly mediaType: string;
}

function decodeImage(image: GeneratedImage, prepared: PreparedGeneration): DecodedImage {
	const bytes = new Uint8Array(Buffer.from(image.b64Json, "base64"));
	const { outputFormat } = prepared.parameters;
	const mediaType =
		image.mediaType ??
		sniffMediaType(bytes) ??
		(outputFormat === undefined ? "image/png" : getMediaTypeForImageType(outputFormat));
	return { bytes, extension: getExtensionForMediaType(mediaType), mediaType };
}

interface OutputContext {
	readonly date: string;
	readonly dependencies: SaveDependencies;
	readonly prepared: PreparedGeneration;
	readonly slug: string;
}

async function writeToOutputAsync(
	context: OutputContext,
	image: DecodedImage,
	index: number,
	count: number,
): Promise<string | undefined> {
	const { dependencies, prepared } = context;
	const spec = prepared.outputSpec;
	if (spec.kind === OutputKind.Stdout) {
		await dependencies.writeStdoutAsync(image.bytes);
		return undefined;
	}

	const naming = { count, date: context.date, extension: image.extension, index, slug: context.slug };
	const planned = getOutputPath(spec, naming);
	if (prepared.input.force && spec.kind === OutputKind.File) {
		return writeFileAtomicAsync(planned, image.bytes);
	}

	const written = await writeFileNoClobberAsync(planned, image.bytes);
	if (written !== planned && spec.kind === OutputKind.File) {
		dependencies.warn(`${planned} appeared while generating; saved as ${written} instead.`);
	}
	return written;
}

interface StoredFile {
	readonly images: ReadonlyArray<string>;
	readonly references: ReadonlyArray<string>;
}

/**
 * Copies the images and references into the history first, so a paid image
 * is safe before anything else can fail.
 *
 * @param run - The paid run being saved.
 * @param images - Every image the API returned, decoded.
 * @param dependencies - The history store and warning sink.
 * @returns The stored image and reference paths, or `undefined` when there
 *   is no history or copying failed.
 */
async function storeCopiesAsync(
	run: RunToSave,
	images: ReadonlyArray<DecodedImage>,
	dependencies: SaveDependencies,
): Promise<StoredFile | undefined> {
	const { history } = dependencies;
	if (history === undefined) return undefined;

	const references = run.prepared.input.references.map((reference) => ({
		bytes: reference.bytes,
		extension: getExtensionForMediaType(reference.mediaType),
	}));
	try {
		return {
			images: await storeFilesAsync(history, run.id, images, ""),
			references: await storeFilesAsync(history, run.id, references, "refs"),
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		dependencies.warn(`Could not copy the run into the history: ${message}`);
		return undefined;
	}
}

function toEntry(
	run: RunToSave,
	stored: { images: ReadonlyArray<string>; references: ReadonlyArray<string> },
	saved: ReadonlyArray<SavedImage>,
): HistoryEntry {
	const { input, parameters } = run.prepared;
	return {
		id: run.id,
		batch: input.batch,
		cost: run.cost,
		created: run.createdAt.toISOString(),
		images: saved.map((image, index) => ({
			mediaType: image.mediaType,
			output: image.path ?? "-",
			stored: stored.images[index] ?? "",
		})),
		model: run.prepared.model.id,
		parent: input.parent,
		prompt: input.prompt,
		references: input.references.map((reference, index) => ({
			source: reference.source,
			stored: stored.references[index] ?? "",
		})),
		request: {
			aspectRatio: parameters.aspectRatio,
			background: parameters.background,
			// oxlint-disable-next-line id-length -- the API calls this field n
			n: parameters.count,
			outputCompression: parameters.outputCompression,
			outputFormat: parameters.outputFormat,
			quality: parameters.quality,
			resolution: parameters.resolution,
			seed: parameters.seed,
		},
		requested: parameters.count,
		returned: run.images.length,
		session: input.session,
	};
}

async function recoverAsync(run: RunToSave, image: DecodedImage, index: number, storedPath?: string): Promise<string> {
	if (storedPath !== undefined) return storedPath;

	const recoveryPath = nodePath.join(tmpdir(), `darkroom-recovered-${run.id}`, `${index}.${image.extension}`);
	return writeFileNoClobberAsync(recoveryPath, image.bytes);
}

async function saveOneAsync(
	context: OutputContext,
	run: RunToSave,
	image: DecodedImage,
	index: number,
	storedPath?: string,
): Promise<{ readonly failure?: SaveFailure; readonly saved: SavedImage }> {
	try {
		const path = await writeToOutputAsync(context, image, index, run.images.length);
		return { saved: { mediaType: image.mediaType, path } };
	} catch (error) {
		const recoveredPath = await recoverAsync(run, image, index, storedPath);
		const message = error instanceof Error ? error.message : String(error);
		return { failure: { message, recoveredPath }, saved: { mediaType: image.mediaType, path: recoveredPath } };
	}
}

async function recordEntryAsync(entry: HistoryEntry, dependencies: SaveDependencies): Promise<void> {
	try {
		if (dependencies.history === undefined) return;
		await appendAsync(dependencies.history, entry);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		dependencies.warn(`Could not record the run in the history: ${message}`);
	}
}

function resolvePathSafely(historyStore: HistoryStore | undefined, stored: string): string | undefined {
	if (historyStore === undefined) return undefined;
	return resolve(historyStore, stored);
}

/**
 * Saves every image of a paid run: into the history, to where the user asked,
 * and as a history entry.
 *
 * Saving never loses an image. When a write to the user's path fails, the
 * history copy (or, without one, a copy in the system temp directory) is
 * reported instead, and the failure is returned rather than thrown.
 *
 * @param run - The run and its images.
 * @param dependencies - The history store and output streams.
 * @returns Where each image went, and any failures.
 */
export async function saveRunAsync(run: RunToSave, dependencies: SaveDependencies): Promise<SaveOutcome> {
	const decoded = run.images.map((image) => decodeImage(image, run.prepared));
	const stored = await storeCopiesAsync(run, decoded, dependencies);
	const context: OutputContext = {
		date: formatLocalDate(run.createdAt),
		dependencies,
		prepared: run.prepared,
		slug: slugify(run.prepared.input.prompt),
	};

	const images: Array<SavedImage> = [];
	const failures: Array<SaveFailure> = [];
	for (const [index, image] of decoded.entries()) {
		const storedPath =
			stored === undefined ? undefined : resolvePathSafely(dependencies.history, stored.images[index] ?? "");
		// oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- sequential writes keep numbering predictable
		const { failure, saved } = await saveOneAsync(context, run, image, index + 1, storedPath);
		images.push(saved);
		if (failure !== undefined) failures.push(failure);
	}

	if (stored !== undefined) await recordEntryAsync(toEntry(run, stored, images), dependencies);

	return { failures, images };
}
