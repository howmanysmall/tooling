import { comparePrices, getListPrice } from "$generation/cost-estimate";
import { getCountRange, getEnumValues, getReferenceRange } from "$generation/model-capabilities";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ModelPricing } from "./model-pricing-utilities";

export interface ModelFilter {
	/** Only models with `n.max > 1`. */
	readonly multi?: boolean | undefined;
	/** Only models whose ID starts with this provider, like `google`. */
	readonly provider?: string | undefined;
	/** Only models that accept this aspect ratio. */
	readonly ratio?: string | undefined;
	/** Only models that accept reference images. */
	readonly refs?: boolean | undefined;
	/** A case-insensitive match on name, ID, and description. */
	readonly search?: string | undefined;
	/** Only models that can make a transparent background. */
	readonly transparent?: boolean | undefined;
}

function matchesSearch(model: ImageModelListItem, search: string | undefined): boolean {
	if (search === undefined) return true;
	const needle = search.toLowerCase();
	return [model.id, model.name, model.description].some((text) => text.toLowerCase().includes(needle));
}

function matchesProvider(model: ImageModelListItem, provider: string | undefined): boolean {
	return provider === undefined || model.id.toLowerCase().startsWith(`${provider.toLowerCase()}/`);
}

function acceptsValue(model: ImageModelListItem, parameter: string, value: string | undefined): boolean {
	return value === undefined || (getEnumValues(model, parameter)?.includes(value) ?? false);
}

/**
 * Keeps the models that pass every filter given.
 *
 * @param models - The image models.
 * @param filter - The filters from the command line.
 * @returns The matching models, in their original order.
 */
export function filterModels(
	models: ReadonlyArray<ImageModelListItem>,
	filter: ModelFilter,
): Array<ImageModelListItem> {
	return models.filter(
		(model) =>
			matchesSearch(model, filter.search) &&
			matchesProvider(model, filter.provider) &&
			(filter.refs !== true || getReferenceRange(model).max > 0) &&
			(filter.multi !== true || getCountRange(model).max > 1) &&
			acceptsValue(model, "aspect_ratio", filter.ratio) &&
			acceptsValue(model, "background", filter.transparent === true ? "transparent" : undefined),
	);
}

export const enum ModelSort {
	Created = "created",
	Name = "name",
	Price = "price",
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Sorts models for `models list`.
 *
 * @param models - The filtered image models.
 * @param sort - `name`, `price` (per-image first, then other units), or
 *   `created` (newest first).
 * @param pricing - Every model's prices.
 * @returns A sorted copy.
 */
export function sortModels(
	models: ReadonlyArray<ImageModelListItem>,
	sort: ModelSort,
	pricing: ModelPricing,
): Array<ImageModelListItem> {
	switch (sort) {
		case ModelSort.Created:
			return models.toSorted((first, second) => second.created - first.created);

		case ModelSort.Name:
			return models.toSorted((first, second) => collator.compare(first.name, second.name));

		case ModelSort.Price: {
			return models.toSorted((first, second) =>
				comparePrices(getListPrice(pricing[first.id] ?? []), getListPrice(pricing[second.id] ?? [])),
			);
		}

		default:
			throw new Error(`Unknown sort: ${String(sort)}`);
	}
}
