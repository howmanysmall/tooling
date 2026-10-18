import type { HistoryEntry, StoredRequest } from "$history/history-entry";

import type { ImageType } from "./media-types";
import type { GenerationOptions } from "./validate-request";

/**
 * Picks the generation options out of the parsed flags, or any object that
 * carries them alongside other fields.
 *
 * @param flags - The parsed flags.
 * @returns The options for validation.
 */
export function toGenerationOptions(flags: GenerationOptions): GenerationOptions {
	return {
		aspectRatio: flags.aspectRatio,
		background: flags.background,
		compression: flags.compression,
		count: flags.count,
		output: flags.output,
		quality: flags.quality,
		resolution: flags.resolution,
		seed: flags.seed,
		type: flags.type,
	};
}

const IMAGE_TYPE_NAMES: ReadonlySet<string> = new Set(["jpeg", "png", "svg", "webp"]);

function isImageType(value?: string): value is ImageType {
	return value !== undefined && IMAGE_TYPE_NAMES.has(value);
}

function toStoredOptions(request: StoredRequest): GenerationOptions {
	return {
		aspectRatio: request.aspectRatio,
		background: request.background,
		compression: request.outputCompression,
		count: request.n,
		quality: request.quality,
		resolution: request.resolution,
		seed: request.seed,
		type: isImageType(request.outputFormat) ? request.outputFormat : undefined,
	};
}

function pickDefined(options: GenerationOptions): GenerationOptions {
	const defined = Object.entries(options).filter(([, value]) => value !== undefined);
	return Object.fromEntries(defined);
}

/**
 * Builds the options for re-running a stored run: its stored request, with
 * any flag given on the command line taking precedence. `-o` is never
 * inherited, so a re-run writes fresh files instead of reusing old names.
 *
 * @param entry - The stored run.
 * @param entry.request - Its stored request.
 * @param flags - The options given to `history rerun`, if any.
 * @returns The options for validation.
 */
export function mergeRerunOptions({ request }: HistoryEntry, flags: GenerationOptions = {}): GenerationOptions {
	return { ...toStoredOptions(request), ...pickDefined(toGenerationOptions(flags)), output: flags.output };
}
