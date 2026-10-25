import { useReducer } from "react";
import { useApp, useStdout, useWindowSize } from "ink";

import { getModelPrices } from "$generation/observed-prices";
import { getNearbyItems } from "$interactive/components/nearby-items";

import { createModelBrowserActions } from "./model-browser-actions";
import { ModelBrowserContext } from "./model-browser-context";
import { createModelBrowserState, getExample, getVisibleModels, reduceModelBrowserState } from "./model-browser-state";

import type { PropsWithChildren, ReactNode } from "react";

import type { ModelSort } from "$utilities/model-filters";

import type { ModelBrowserActions, ModelBrowserContextValue, ModelBrowserLayout } from "./model-browser-context";
import type { ModelBrowserServices } from "./model-browser-services";
import type { ModelBrowserState, ModelCatalog } from "./model-browser-state";

export interface ModelBrowserProviderProperties {
	catalog: ModelCatalog;
	/** When the browser opened, for naming days like `Today`. */
	now: Date;
	services: ModelBrowserServices;
	/** The order the list opens in. */
	sort: ModelSort;
}

// The header, the status bar, and the list's padding above and below.
const CHROME_ROWS = 4;

// The gap between the panes, then the detail pane's padding on each side.
const DETAIL_CHROME_COLUMNS = 1 + 6;

// The share of the width the model list gets; the details get the rest.
const LIST_SHARE = 0.45;

// The share of the detail pane an example image may fill.
const PREVIEW_SHARE = 0.4;

function getLayout(columns: number, rows: number): ModelBrowserLayout {
	const listHeight = Math.max(1, rows - CHROME_ROWS);
	const listWidth = Math.floor(columns * LIST_SHARE);
	return {
		columns,
		listHeight,
		listWidth,
		previewBox: {
			columns: Math.max(1, columns - listWidth - DETAIL_CHROME_COLUMNS),
			rows: Math.max(3, Math.floor(listHeight * PREVIEW_SHARE)),
		},
		rows,
	};
}

interface ContextParts {
	readonly actions: ModelBrowserActions;
	readonly browser: ModelBrowserState;
	readonly layout: ModelBrowserLayout;
	readonly now: Date;
	readonly services: ModelBrowserServices;
}

function createContextValue({ actions, browser, layout, now, services }: ContextParts): ModelBrowserContextValue {
	const { models, observed, pricing, shippedExamples, yourExamples } = browser.catalog;
	const visible = getVisibleModels(browser);
	return {
		actions,
		meta: {
			canSwitchExample: (model) => shippedExamples.has(model.id) && yourExamples.has(model.id),
			getExample: (model) => getExample(browser, model.id),
			getPreview: (example) => services.getPreview(example.path, layout.previewBox),
			getPrices: (model) => getModelPrices(pricing, observed, model.id),
			layout,
			now,
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
 * Starts loading the examples of the models around the selection, so
 * moving through the list finds them ready instead of blank.
 *
 * @param value - The browser's models, cursor, and previews.
 * @param value.meta - Finds examples and loads previews.
 * @param value.state - The models shown and the selection.
 */
function preloadNearby({ meta, state }: ModelBrowserContextValue): void {
	for (const model of getNearbyItems(state.models, state.selectedIndex)) {
		const example = meta.getExample(model);
		if (example !== undefined) {
			meta.getPreview(example);
		}
	}
}

/**
 * Owns the model browser's state. Every part reads the same
 * `{ state, actions, meta }` from it, so no part needs props.
 *
 * @param properties - The models, their prices, and the parts.
 * @param properties.catalog - The models, what they cost, and their examples.
 * @param properties.now - When the browser opened, for naming days.
 * @param properties.services - Chooses a model and loads previews.
 * @param properties.sort - The order the list opens in.
 * @param properties.children - The browser's parts.
 * @returns The parts, with the browser context around them.
 */
export function ModelBrowserProvider({
	catalog,
	now,
	services,
	sort,
	children,
}: Readonly<PropsWithChildren<ModelBrowserProviderProperties>>): ReactNode {
	const [browser, dispatch] = useReducer(reduceModelBrowserState, undefined, () =>
		createModelBrowserState(catalog, sort),
	);
	const { exit } = useApp();
	const { write } = useStdout();
	const { columns, rows } = useWindowSize();
	const layout = getLayout(columns, rows);
	const actions = createModelBrowserActions({
		chooseModel: services.chooseModel,
		dispatch,
		exit,
		pageSize: layout.listHeight,
		selected: getVisibleModels(browser)[browser.cursor],
		write,
	});
	const value = createContextValue({ actions, browser, layout, now, services });
	preloadNearby(value);

	return <ModelBrowserContext value={value}>{children}</ModelBrowserContext>;
}
