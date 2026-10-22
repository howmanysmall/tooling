import { getEnumValues, isDeclared } from "$generation/model-capabilities";
import { getModelPrices, getPerImagePrice } from "$generation/observed-prices";
import { filterModels } from "$utilities/model-filters";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { GenerationOptions } from "$generation/validate-request";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

/**
 * Good models to use when a call names none, best first. Models missing from
 * OpenRouter's list, or priced over `MAX_PICKED_PRICE`, are skipped.
 */
export const PREFERRED_MODELS: ReadonlyArray<string> = [
	"black-forest-labs/flux.2-pro",
	"bytedance-seed/seedream-5-0-flash",
	"qwen/qwen-image-3",
	"black-forest-labs/flux.2-klein-4b",
];

/**
 * The most darkroom spends per image on a model it picked, in US dollars. A
 * model without a known per-image price is never picked, so a caller who
 * named no model can't be billed an unknown amount.
 */
export const MAX_PICKED_PRICE = 0.1;

/** The most models one call tries before giving up. */
export const MAX_ATTEMPTS = 3;

export interface ModelRequest {
	readonly aspectRatio?: string | undefined;
	readonly background?: string | undefined;
	readonly count?: number | undefined;
	readonly referenceCount: number;
}

export interface ModelPriceList {
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
}

/**
 * Picks models for a call that names none: the preferred models, then the
 * cheapest others. Each must serve the request and cost at most
 * `MAX_PICKED_PRICE` per image.
 *
 * @param models - Every image model.
 * @param request - What the models must support.
 * @param prices - Published prices, and what past runs cost.
 * @param prices.observed - What each model cost per image in past runs.
 * @param prices.pricing - Each model's published prices.
 * @returns Up to `MAX_ATTEMPTS` model IDs, best first.
 */
export function chooseModels(
	models: ReadonlyArray<ImageModelListItem>,
	request: ModelRequest,
	{ observed, pricing }: ModelPriceList,
): Array<string> {
	const priced = filterModels(models, {
		multi: (request.count ?? 1) > 1,
		ratio: request.aspectRatio,
		refs: request.referenceCount > 0,
		transparent: request.background === "transparent",
	}).flatMap((model) => {
		const price = getPerImagePrice(getModelPrices(pricing, observed, model.id));
		return price === undefined || price > MAX_PICKED_PRICE ? [] : [{ id: model.id, price }];
	});
	const affordable = new Set(priced.map(({ id }) => id));
	const preferred = PREFERRED_MODELS.filter((id) => affordable.has(id));
	const cheapest = priced.toSorted((first, second) => first.price - second.price).map(({ id }) => id);
	return [...new Set([...preferred, ...cheapest])].slice(0, MAX_ATTEMPTS);
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
