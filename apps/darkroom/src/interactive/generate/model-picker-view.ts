import { getCountRange, getEnumValues, getReferenceRange } from "$generation/model-capabilities";
import { getModelPrices, getPerImagePrice } from "$generation/observed-prices";
import { ModelSort, sortModels } from "$utilities/model-filters";

import { getModelMatches } from "./model-picker-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { ModelMatch } from "./model-picker-state";

/** The order the picker lists models in. */
export const enum PickerSort {
	Name = "name",
	Newest = "newest",
	Price = "price",
	/** Recently used first, then by name; with a query, the best match. */
	Recent = "recent",
}

/** The orders, as the picker offers them and `tab` cycles them. */
export const PICKER_SORTS: ReadonlyArray<PickerSort> = [
	PickerSort.Recent,
	PickerSort.Price,
	PickerSort.Name,
	PickerSort.Newest,
];

/** What a model must be able to do to be listed. */
export const enum PickerFilter {
	/** Takes reference images, so it can edit one. */
	Edits = "edits",
	/** Makes more than one image per request. */
	Several = "several",
	/** Makes images with a transparent background. */
	Transparent = "transparent",
}

export const PICKER_FILTERS: ReadonlyArray<PickerFilter> = [
	PickerFilter.Edits,
	PickerFilter.Several,
	PickerFilter.Transparent,
];

/** How the picker sorts and filters, apart from what is typed. */
export interface PickerView {
	readonly filters: ReadonlySet<PickerFilter>;
	readonly sort: PickerSort;
}

export type PickerViewAction =
	| { readonly delta: number; readonly type: "cycle-sort" }
	| { readonly filter: PickerFilter; readonly type: "toggle-filter" }
	| { readonly sort: PickerSort; readonly type: "sort" };

/**
 * Applies a change to the picker's sort or filters.
 *
 * @param view - How the picker sorts and filters now.
 * @param action - A sort chosen or cycled, or a filter toggled.
 * @returns The next view.
 */
export function reducePickerView(view: PickerView, action: PickerViewAction): PickerView {
	switch (action.type) {
		case "cycle-sort": {
			const { length } = PICKER_SORTS;
			const index = PICKER_SORTS.indexOf(view.sort);
			return { ...view, sort: PICKER_SORTS[(((index + action.delta) % length) + length) % length] ?? view.sort };
		}

		case "sort":
			return { ...view, sort: action.sort };
		default: {
			const filters = new Set(view.filters);
			if (filters.has(action.filter)) {
				filters.delete(action.filter);
			} else {
				filters.add(action.filter);
			}

			return { ...view, filters };
		}
	}
}

/** What a query asks for, beyond the text matched against names. */
export interface PickerQuery {
	/** Filters typed as `+edits`, `+several`, or `+transparent`, or a prefix. */
	readonly filters: ReadonlySet<PickerFilter>;
	/** The most an image may cost, typed as `$0.02`. */
	readonly maxPrice?: number | undefined;
	/** The provider, typed as `@google`. */
	readonly provider?: string | undefined;
	/** The rest, matched against names and IDs. */
	readonly text: string;
}

const MAX_PRICE = /^\$(?<amount>\d+(?:\.\d+)?|\.\d+)$/u;
const WHITESPACE = /\s+/u;

function findFilter(prefix: string): PickerFilter | undefined {
	return prefix.length === 0 ? undefined : PICKER_FILTERS.find((filter) => filter.startsWith(prefix));
}

/**
 * Splits a picker query into its tokens: `@provider`, `$max` per image,
 * and `+filter`, with the rest left as text to match.
 *
 * @param query - What has been typed.
 * @returns The tokens and the text.
 */
export function parsePickerQuery(query: string): PickerQuery {
	const filters = new Set<PickerFilter>();
	const words: Array<string> = [];
	let maxPrice: number | undefined;
	let provider: string | undefined;
	for (const word of query.trim().split(WHITESPACE)) {
		const amount = MAX_PRICE.exec(word)?.groups?.amount;
		const filter = word.startsWith("+") ? findFilter(word.slice(1).toLowerCase()) : undefined;
		if (amount !== undefined) {
			maxPrice = Number(amount);
		} else if (word.startsWith("@") && word.length > 1) {
			provider = word.slice(1).toLowerCase();
		} else if (filter === undefined) {
			words.push(word);
		} else {
			filters.add(filter);
		}
	}

	return { filters, maxPrice, provider, text: words.join(" ") };
}

function canDo(model: ImageModelListItem, filter: PickerFilter): boolean {
	if (filter === PickerFilter.Edits) return getReferenceRange(model).max > 0;
	if (filter === PickerFilter.Several) return getCountRange(model).max > 1;
	return getEnumValues(model, "background")?.includes("transparent") ?? false;
}

/** What the picker knows besides the models: your history and prices. */
export interface PickerContext {
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
	/** Models you used lately, most recent first. */
	readonly recentIds: ReadonlyArray<string>;
}

function isWithinPrice(model: ImageModelListItem, maxPrice: number, context: PickerContext): boolean {
	const price = getPerImagePrice(getModelPrices(context.pricing, context.observed, model.id));
	return price !== undefined && price <= maxPrice;
}

const MODEL_SORTS: Readonly<Record<Exclude<PickerSort, PickerSort.Recent>, ModelSort>> = {
	[PickerSort.Name]: ModelSort.Name,
	[PickerSort.Newest]: ModelSort.Created,
	[PickerSort.Price]: ModelSort.Price,
};

function orderMatches(matches: ReadonlyArray<ModelMatch>, sort: PickerSort, context: PickerContext): Array<ModelMatch> {
	if (sort === PickerSort.Recent) {
		return [...matches];
	}

	const byId = new Map(matches.map((match) => [match.model.id, match]));
	const sorted = sortModels(
		matches.map((match) => match.model),
		MODEL_SORTS[sort],
		context.pricing,
		context.observed,
	);

	return sorted.flatMap((model) => byId.get(model.id) ?? []);
}

/**
 * Lists the models the picker shows: those that can do everything the
 * chips and the query ask, from the provider asked for and within the
 * price, matched against the rest of the query the way fzf does, in the
 * chosen order. With the recent order and a query, the best match leads.
 *
 * @param models - Every model.
 * @param query - What has been typed.
 * @param view - The chosen sort and filters.
 * @param context - Your recent models and the prices.
 * @returns The models to list, with what the query matched.
 */
export function findPickerModels(
	models: ReadonlyArray<ImageModelListItem>,
	query: string,
	view: PickerView,
	context: PickerContext,
): Array<ModelMatch> {
	const { filters, maxPrice, provider, text } = parsePickerQuery(query);
	const required = [...view.filters, ...filters];
	const kept = models.filter(
		(model) =>
			required.every((filter) => canDo(model, filter)) &&
			(provider === undefined || model.id.toLowerCase().startsWith(provider)) &&
			(maxPrice === undefined || isWithinPrice(model, maxPrice, context)),
	);

	return orderMatches(getModelMatches(kept, context.recentIds, text), view.sort, context);
}

/**
 * Says what a model can do beyond making one image from text, for its row
 * in the picker.
 *
 * @param model - The model to describe.
 * @returns Like `edits · ×4 · transparent`, or empty.
 */
export function describeAbilities(model: ImageModelListItem): string {
	const abilities: Array<string> = [];
	if (canDo(model, PickerFilter.Edits)) {
		abilities.push("edits");
	}

	const count = getCountRange(model).max;
	if (count > 1) {
		abilities.push(`×${count}`);
	}

	if (canDo(model, PickerFilter.Transparent)) {
		abilities.push("transparent");
	}

	return abilities.join(" · ");
}
