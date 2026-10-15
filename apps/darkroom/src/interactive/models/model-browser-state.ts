import { clampCursor, isCursorMove, moveCursor } from "$interactive/components/list-cursor";
import { reduceStatus } from "$interactive/components/status-message";
import { filterModels, ModelSort, sortModels } from "$utilities/model-filters";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { CursorMove } from "$interactive/components/list-cursor";
import type { StatusAction, StatusMessage } from "$interactive/components/status-message";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { ModelExample } from "./model-examples";

/** The models to browse, what they cost, and what they make. */
export interface ModelCatalog {
	readonly models: ReadonlyArray<ImageModelListItem>;
	/** What models have cost per image in past runs. */
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
	/** The example shipped with darkroom for each model, keyed by model ID. */
	readonly shippedExamples: ReadonlyMap<string, ModelExample>;
	/** The newest image you made with each model, keyed by model ID. */
	readonly yourExamples: ReadonlyMap<string, ModelExample>;
}

export interface ModelBrowserState {
	readonly catalog: ModelCatalog;
	/** Index of the selected model within the visible ones. */
	readonly cursor: number;
	/** Text the name, ID, or description must contain. */
	readonly filter: string;
	readonly isFiltering: boolean;
	/** Shows the shipped example even when you have your own. */
	readonly prefersShipped: boolean;
	readonly sort: ModelSort;
	readonly status?: StatusMessage | undefined;
}

export type ModelBrowserAction =
	| CursorMove
	| StatusAction
	| { readonly filter: string; readonly type: "filter" }
	| { readonly id: string; readonly type: "select" }
	| { readonly isFiltering: boolean; readonly type: "filtering" }
	| { readonly type: "cancel-filter" }
	| { readonly type: "next-sort" }
	| { readonly type: "switch-example" };

const NEXT_SORT: ReadonlyMap<ModelSort, ModelSort> = new Map([
	[ModelSort.Created, ModelSort.Name],
	[ModelSort.Name, ModelSort.Price],
	[ModelSort.Price, ModelSort.Created],
]);

export function createModelBrowserState(catalog: ModelCatalog, sort: ModelSort): ModelBrowserState {
	return { catalog, cursor: 0, filter: "", isFiltering: false, prefersShipped: false, sort };
}

/**
 * Picks the image to show for a model: yours first, unless the shipped
 * example was asked for; either one when only it exists.
 *
 * @param state - The browser state.
 * @param modelId - Which model to show.
 * @returns The example, or `undefined` when there is none.
 */
export function getExample(state: ModelBrowserState, modelId: string): ModelExample | undefined {
	const yours = state.catalog.yourExamples.get(modelId);
	const shipped = state.catalog.shippedExamples.get(modelId);
	return state.prefersShipped ? (shipped ?? yours) : (yours ?? shipped);
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

function setFilter(state: ModelBrowserState, filter: string): ModelBrowserState {
	// The input reports its text from an effect, which can land after Esc,
	// and re-reports unchanged text; both must leave the state alone.
	const trimmed = filter.trim();
	if (!state.isFiltering || trimmed === state.filter) return state;

	return { ...state, cursor: 0, filter: trimmed };
}

function cycleSort(state: ModelBrowserState): ModelBrowserState {
	const selectedId = getVisibleModels(state)[state.cursor]?.id;
	const next = { ...state, sort: NEXT_SORT.get(state.sort) ?? ModelSort.Name };
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
		return { ...state, cursor: moveCursor(state.cursor, action, getVisibleModels(state).length) };
	}

	switch (action.type) {
		case "cancel-filter":
			return { ...state, cursor: 0, filter: "", isFiltering: false };

		case "filter":
			return setFilter(state, action.filter);

		case "filtering":
			return { ...state, isFiltering: action.isFiltering };

		case "next-sort":
			return cycleSort(state);

		case "select": {
			const index = getVisibleModels(state).findIndex((model) => model.id === action.id);
			return index === -1 ? state : { ...state, cursor: index };
		}

		case "switch-example":
			return { ...state, prefersShipped: !state.prefersShipped };

		default:
			return { ...state, status: reduceStatus(state.status, action) };
	}
}
