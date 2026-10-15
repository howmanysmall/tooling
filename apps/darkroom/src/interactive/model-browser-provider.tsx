import { useReducer } from "react";
import { useApp, useStdout, useWindowSize } from "ink";

import { getModelPrices } from "$generation/observed-prices";

import { createModelBrowserActions } from "./model-browser-actions";
import { ModelBrowserContext } from "./model-browser-context";
import { createModelBrowserState, getVisibleModels, reduceModelBrowserState } from "./model-browser-state";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { ModelSort } from "$utilities/model-filters";

import type { ModelBrowserActions, ModelBrowserContextValue, ModelBrowserLayout } from "./model-browser-context";
import type { ModelBrowserState, ModelCatalog } from "./model-browser-state";

export interface ModelBrowserProviderProperties {
	catalog: ModelCatalog;
	/** Takes the model chosen with Enter, once the browser has closed. */
	onChoose: (model: ImageModelListItem) => void;
	/** The order the list opens in. */
	sort: ModelSort;
	children: ReactNode;
}

// The header, the footer, and the list's top and bottom borders.
const CHROME_ROWS = 4;
// The share of the width the model list gets; the details get the rest.
const LIST_SHARE = 0.45;

function getLayout(columns: number, rows: number): ModelBrowserLayout {
	return { columns, listHeight: Math.max(1, rows - CHROME_ROWS), listWidth: Math.floor(columns * LIST_SHARE), rows };
}

function createContextValue(
	browser: ModelBrowserState,
	actions: ModelBrowserActions,
	layout: ModelBrowserLayout,
): ModelBrowserContextValue {
	const { models, observed, pricing } = browser.catalog;
	const visible = getVisibleModels(browser);
	return {
		actions,
		meta: {
			getPrices: (model) => getModelPrices(pricing, observed, model.id),
			layout,
		},
		state: {
			filter: browser.filter,
			isFiltering: browser.isFiltering,
			models: visible,
			selected: visible[browser.cursor],
			selectedIndex: browser.cursor,
			sort: browser.sort,
			status: browser.status,
			total: models.length,
		},
	};
}

/**
 * Owns the model browser's state. Every part reads the same
 * `{ state, actions, meta }` from it, so no part needs props.
 *
 * @param properties - The models, their prices, and the parts.
 * @param properties.catalog - The models to browse and what they cost.
 * @param properties.onChoose - Takes the model chosen with Enter.
 * @param properties.sort - The order the list opens in.
 * @param properties.children - The browser's parts.
 * @returns The parts, with the browser context around them.
 */
export function ModelBrowserProvider({
	catalog,
	onChoose,
	sort,
	children,
}: Readonly<ModelBrowserProviderProperties>): ReactNode {
	const [browser, dispatch] = useReducer(reduceModelBrowserState, undefined, () =>
		createModelBrowserState(catalog, sort),
	);
	const { exit } = useApp();
	const { write } = useStdout();
	const { columns, rows } = useWindowSize();
	const layout = getLayout(columns, rows);
	const selected = getVisibleModels(browser)[browser.cursor];
	const actions = createModelBrowserActions({
		dispatch,
		exit,
		onChoose,
		pageSize: layout.listHeight,
		selected,
		write,
	});

	return <ModelBrowserContext value={createContextValue(browser, actions, layout)}>{children}</ModelBrowserContext>;
}
