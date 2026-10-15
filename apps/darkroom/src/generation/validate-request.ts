import nodePath from "node:path";
import { ValidationError } from "@cliffy/command";
import { formatArrayAsEnglishList } from "@howmanysmall/english-utilities/format-array-as-english-list";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { getImageTypeFromPath, ImageType } from "./media-types";
import { getCountRange, getEnumValues, getRange, getReferenceRange, isDeclared } from "./model-capabilities";

import type { ImageModelListItem } from "@openrouter/sdk/models";

/**
 * The generation flags shared by `generate`, `history rerun`, and interactive
 * mode.
 */
export interface GenerationOptions {
	readonly aspectRatio?: string | undefined;
	readonly background?: string | undefined;
	readonly compression?: number | undefined;
	readonly count?: number | undefined;
	/** The `-o` value: a file, a directory, or `-`. */
	readonly output?: string | undefined;
	readonly quality?: string | undefined;
	readonly resolution?: string | undefined;
	readonly seed?: number | undefined;
	readonly type?: ImageType | undefined;
}

export interface ValidationContext {
	readonly model: ImageModelListItem;
	readonly referenceCount: number;
	readonly stdoutIsTty: boolean;
}

/** The request parameters after validation, in API terms. */
export interface ResolvedParameters {
	readonly aspectRatio?: string | undefined;
	readonly background?: string | undefined;
	readonly count: number;
	readonly outputCompression?: number | undefined;
	readonly outputFormat?: ImageType | undefined;
	readonly quality?: string | undefined;
	readonly resolution?: string | undefined;
	readonly seed?: number | undefined;
}

export interface ValidatedRequest {
	readonly parameters: ResolvedParameters;
	/** Problems that don't block the request, for stderr. */
	readonly warnings: ReadonlyArray<string>;
}

const MAX_COUNT = 10;
const TRANSPARENT_TYPES: ReadonlySet<ImageType> = new Set([ImageType.Png, ImageType.Webp]);

function formatValues(values: ReadonlyArray<string>): string {
	return formatArrayAsEnglishList(
		values.map((value) => `"${value}"`),
		"or",
	);
}

function checkEnum(model: ImageModelListItem, parameter: string, flag: string, value: string | undefined): void {
	if (value === undefined) return;

	const values = getEnumValues(model, parameter);
	if (values === undefined || values.includes(value)) return;

	throw new ValidationError(`${model.id} does not support ${flag} "${value}". Supported: ${formatValues(values)}.`);
}

function checkCount(model: ImageModelListItem, count: number): void {
	if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
		throw new ValidationError(`--count must be a whole number from 1 to ${MAX_COUNT}; got ${count}.`);
	}

	const { max } = getCountRange(model);
	if (count > max) {
		throw new ValidationError(
			`${model.id} returns at most ${max} ${toPlural(max, "image")} per request; --count was ${count}.`,
		);
	}
}

function checkReferences(model: ImageModelListItem, referenceCount: number): void {
	const { max, min } = getReferenceRange(model);
	if (max === 0 && referenceCount > 0) {
		throw new ValidationError(`${model.id} does not accept reference images.`);
	}
	if (referenceCount > max) {
		throw new ValidationError(
			`${model.id} accepts at most ${max} reference ${toPlural(max, "image")}; got ${referenceCount}.`,
		);
	}
	if (referenceCount < min) {
		throw new ValidationError(
			`${model.id} needs at least ${min} reference ${toPlural(min, "image")}; got ${referenceCount}.`,
		);
	}
}

/**
 * Works out the output encoding. The `-o` extension wins over `--type`, and
 * they must agree when both are given.
 *
 * @param output - The `-o` value.
 * @param type - The `--type` value.
 * @returns The encoding, or `undefined` to let the model choose.
 */
function resolveOutputFormat(output: string | undefined, type: ImageType | undefined): ImageType | undefined {
	if (output === undefined || output === "-" || output.endsWith("/")) return type;
	if (nodePath.extname(output).length === 0) return type;

	const pathType = getImageTypeFromPath(output);
	if (pathType === undefined) {
		throw new ValidationError(`-o ${output} has an extension darkroom can't write.`);
	}
	if (type !== undefined && type !== pathType) {
		throw new ValidationError(`--type ${type} disagrees with the extension of -o ${output}.`);
	}
	return pathType;
}

function checkStdout(options: GenerationOptions, count: number, stdoutIsTty: boolean): void {
	if (options.output !== "-") return;
	if (count > 1) {
		throw new ValidationError("-o - writes a single image; use --count 1.");
	}
	if (stdoutIsTty) {
		throw new ValidationError("-o - would write binary image data to the terminal. Pipe it instead.");
	}
}

function checkCompression(model: ImageModelListItem, compression: number | undefined): void {
	if (compression === undefined) return;
	const range = getRange(model, "output_compression") ?? { max: 100, min: 0 };
	if (!Number.isInteger(compression) || compression < range.min || compression > range.max) {
		throw new ValidationError(`--compression must be from ${range.min} to ${range.max}; got ${compression}.`);
	}
}

function collectWarnings(
	model: ImageModelListItem,
	options: GenerationOptions,
	outputFormat?: ImageType,
): Array<string> {
	const warnings: Array<string> = [];
	if (options.seed !== undefined && !isDeclared(model, "seed")) {
		warnings.push(`${model.id} does not declare seed support; --seed may be ignored.`);
	}
	if (options.compression !== undefined && outputFormat === ImageType.Png) {
		warnings.push("--compression has no effect on PNG output.");
	}
	return warnings;
}

/**
 * Checks the flags against what the model declares, before any request is
 * sent. Parameters a model doesn't declare are passed through unchecked, and
 * OpenRouter clamps them.
 *
 * @param options - The generation flags.
 * @param context - The model and what else is known about the run.
 * @returns The parameters to send and any warnings.
 */
export function validateRequest(options: GenerationOptions, context: ValidationContext): ValidatedRequest {
	const { model } = context;
	const count = options.count ?? 1;

	checkCount(model, count);
	checkEnum(model, "aspect_ratio", "--aspect-ratio", options.aspectRatio);
	checkEnum(model, "resolution", "--resolution", options.resolution);
	checkEnum(model, "quality", "--quality", options.quality);
	checkEnum(model, "background", "--background", options.background);
	checkReferences(model, context.referenceCount);
	checkCompression(model, options.compression);
	checkStdout(options, count, context.stdoutIsTty);

	const outputFormat = resolveOutputFormat(options.output, options.type);
	checkEnum(model, "output_format", "--type", outputFormat);
	if (outputFormat !== undefined && options.background === "transparent" && !TRANSPARENT_TYPES.has(outputFormat)) {
		throw new ValidationError(`--background transparent needs png or webp output, not ${outputFormat}.`);
	}

	return {
		parameters: {
			aspectRatio: options.aspectRatio,
			background: options.background,
			count,
			outputCompression: options.compression,
			outputFormat,
			quality: options.quality,
			resolution: options.resolution,
			seed: options.seed,
		},
		warnings: collectWarnings(model, options, outputFormat),
	};
}
