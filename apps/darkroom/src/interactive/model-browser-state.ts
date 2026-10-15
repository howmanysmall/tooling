import { filterModels, ModelSort, sortModels } from "$utilities/model-filters";

import { clampCursor, moveCursor } from "./list-cursor";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { CursorMove } from "./list-cursor";
import type { ModelExample } from "./model-examples";
import type { StatusMessage } from "./status-message";

/** The models to browse, what they cost, and what they made for you. */
export interface ModelCatalog {
	/** The newest image each model made, keyed by model ID. */
	readonly examples: ReadonlyMap<string, ModelExample>;
	readonly models: ReadonlyArray<ImageModelListItem>;
	/** What models have cost per image in past runs. */
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
}

export interface ModelBrowserState {
	readonly catalog: ModelCatalog;
	/** Index of the selected model within the visible ones. */
	readonly cursor: number;
	/** Text the name, ID, or description must contain. */
	readonly filter: string;
	readonly isFiltering: boolean;
	readonly sort: ModelSort;
	readonly status?: StatusMessage | undefined;
}

export type ModelBrowserAction =
	| CursorMove
	| { readonly filter: string; readonly type: "filter" }
	| { readonly isFiltering: boolean; readonly type: "filtering" }
	| { readonly status: StatusMessage | undefined; readonly type: "status" }
	| { readonly type: "cancel-filter" }
	| { readonly type: "next-sort" };

const NEXT_SORT: ReadonlyMap<ModelSort, ModelSort> = new Map([
	[ModelSort.Created, ModelSort.Name],
	[ModelSort.Name, ModelSort.Price],
	[ModelSort.Price, ModelSort.Created],
]);

export function createModelBrowserState(catalog: ModelCatalog, sort: ModelSort): ModelBrowserState {
	return { catalog, cursor: 0, filter: "", isFiltering: false, sort };
}

/**
 * Gets the models that match the filter, in the chosen order.
 *
 * @param state - The browser state.
 * @returns The models to list.
 */
export function getVisibleModels(state: ModelBrowserState): Array<ImageModelListItem> {
	const { models, observed, pricing } = state.catalog;
	const search = state.filter.length === 0 ? undefined : state.filter;
	return sortModels(filterModels(models, { search }), state.sort, pricing, observed);
}

function isCursorMove(action: ModelBrowserAction): action is CursorMove {
	return action.type === "move" || action.type === "first" || action.type === "last";
}

function setFilter(state: ModelBrowserState, filter: string): ModelBrowserState {
	// The input reports its text from an effect, which can land after Esc,
	// and re-reports unchanged text; both must leave the state alone.
	const trimmed = filter.trim();
	if (!state.isFiltering || trimmed === state.filter) return state;

	return { ...state, cursor: 0, filter: trimmed };
}

function cycleSort(state: ModelBrowserState): ModelBrowserState {
	const selectedId = getVisibleModels(state)[state.cursor]?.id;
	const next = { ...state, sort: NEXT_SORT.get(state.sort) ?? ModelSort.Name, status: undefined };
	const models = getVisibleModels(next);
	// Keep the same model selected in its new place.
	const cursor = models.findIndex((model) => model.id === selectedId);
	return { ...next, cursor: clampCursor(cursor, models.length) };
}

/**
 * Applies one model browser action. Pure, so every key can be tested
 * without a terminal.
 *
 * @param state - The current state.
 * @param action - What happened.
 * @returns The next state.
 */
export function reduceModelBrowserState(state: ModelBrowserState, action: ModelBrowserAction): ModelBrowserState {
	if (isCursorMove(action)) {
		return {
			...state,
			cursor: moveCursor(state.cursor, action, getVisibleModels(state).length),
			status: undefined,
		};
	}

	switch (action.type) {
		case "cancel-filter":
			return { ...state, cursor: 0, filter: "", isFiltering: false };

		case "filter":
			return setFilter(state, action.filter);

		case "filtering":
			return { ...state, isFiltering: action.isFiltering, status: undefined };

		case "next-sort":
			return cycleSort(state);

		default:
			return { ...state, status: action.status };
	}
}
