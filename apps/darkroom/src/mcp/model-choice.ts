import { getEnumValues, isDeclared } from "$generation/model-capabilities";
import { filterModels } from "$utilities/model-filters";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { GenerationOptions } from "$generation/validate-request";

/**
 * Good, flat-priced models to use when a call names none, best first. Each
 * bills a fixed amount per image, so the estimate a caller sees is the price
 * they pay. Models missing from OpenRouter's list are skipped.
 */
export const PREFERRED_MODELS: ReadonlyArray<string> = [
	"black-forest-labs/flux.2-pro",
	"bytedance-seed/seedream-5-0-flash",
	"qwen/qwen-image-3",
	"google/gemini-3.1-flash-image",
];

/** The most models one call tries before giving up. */
export const MAX_ATTEMPTS = 3;

export interface ModelRequest {
	readonly aspectRatio?: string | undefined;
	readonly background?: string | undefined;
	readonly count?: number | undefined;
	readonly referenceCount: number;
}

/**
 * Picks the models to try, in order, when a call names none: the server's
 * default, then the preferred models, then any other model that can serve
 * the request.
 *
 * @param models - Every image model.
 * @param request - What the models must support.
 * @param defaultModel - `DARKROOM_MODEL`, if set.
 * @returns Up to `MAX_ATTEMPTS` model IDs.
 */
export function chooseModels(
	models: ReadonlyArray<ImageModelListItem>,
	request: ModelRequest,
	defaultModel?: string,
): Array<string> {
	const fitting = filterModels(models, {
		multi: (request.count ?? 1) > 1,
		ratio: request.aspectRatio,
		refs: request.referenceCount > 0,
		transparent: request.background === "transparent",
	}).map((model) => model.id);
	const available = new Set(fitting);
	const ordered = [...(defaultModel === undefined ? [] : [defaultModel]), ...PREFERRED_MODELS, ...fitting];
	return [...new Set(ordered)].filter((id) => available.has(id)).slice(0, MAX_ATTEMPTS);
}

/** Each option, the wire parameter it sets, and its name in tool inputs. */
const OPTION_PARAMETERS = [
	["aspectRatio", "aspect_ratio"],
	["background", "background"],
	["compression", "output_compression"],
	["quality", "quality"],
	["resolution", "resolution"],
	["seed", "seed"],
	["type", "output_format"],
] as const satisfies ReadonlyArray<readonly [keyof GenerationOptions, string]>;

export interface FittedOptions {
	readonly options: GenerationOptions;
	/** What was left out and why, for the result's warnings. */
	readonly warnings: ReadonlyArray<string>;
}

/**
 * Leaves out options the model doesn't declare: providers reject parameters
 * they don't know, and a caller rarely knows which ones a model takes. When
 * darkroom picked the model, values the model doesn't list are left out too,
 * since the caller never chose that model.
 *
 * @param model - The model the request goes to.
 * @param options - The options as given.
 * @param isPicked - Whether darkroom chose the model.
 * @returns The options to validate, and what was left out.
 */
export function fitOptions(model: ImageModelListItem, options: GenerationOptions, isPicked: boolean): FittedOptions {
	const leftOut: Array<[keyof GenerationOptions, undefined]> = [];
	const warnings: Array<string> = [];
	for (const [option, parameter] of OPTION_PARAMETERS) {
		const value = options[option];
		if (value === undefined) continue;

		if (!isDeclared(model, parameter)) {
			leftOut.push([option, undefined]);
			warnings.push(`${model.id} doesn't take ${option}, so it was left out.`);
			continue;
		}

		const values = getEnumValues(model, parameter);
		if (!isPicked || values === undefined || values.includes(String(value))) continue;

		leftOut.push([option, undefined]);
		warnings.push(`${model.id} doesn't support ${option} ${String(value)}, so it was left out.`);
	}
	return { options: { ...options, ...Object.fromEntries(leftOut) }, warnings };
}
