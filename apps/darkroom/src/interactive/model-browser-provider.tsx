import { useReducer } from "react";
import { useApp, useStdout, useWindowSize } from "ink";

import { getModelPrices } from "$generation/observed-prices";

import { createModelBrowserActions } from "./model-browser-actions";
import { ModelBrowserContext } from "./model-browser-context";
import { createModelBrowserState, getVisibleModels, reduceModelBrowserState } from "./model-browser-state";

import type { ReactNode } from "react";

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
	children: ReactNode;
}

// The header, the footer, and the list's top and bottom borders.
const CHROME_ROWS = 4;
// The gap between the panes, then the detail pane's borders and padding.
const DETAIL_CHROME_COLUMNS = 1 + 2 + 4;
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
	const { examples, models, observed, pricing } = browser.catalog;
	const visible = getVisibleModels(browser);
	return {
		actions,
		meta: {
			getExample: (model) => examples.get(model.id),
			getPreview: (example) => services.getPreview(example.stored, layout.previewBox),
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
 * Owns the model browser's state. Every part reads the same
 * `{ state, actions, meta }` from it, so no part needs props.
 *
 * @param properties - The models, their prices, and the parts.
 * @param properties.catalog - The models, what they cost, and your examples.
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
}: Readonly<ModelBrowserProviderProperties>): ReactNode {
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

	return <ModelBrowserContext value={value}>{children}</ModelBrowserContext>;
}
