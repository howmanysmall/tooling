import { useReducer } from "react";
import { useApp, useStdout, useWindowSize } from "ink";

import { createBrowserActions } from "./history-browser-actions";
import { HistoryBrowserContext } from "./history-browser-context";
import { createBrowserState, getSelectedRun, getVisibleRuns, reduceBrowserState } from "./history-browser-state";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { LoadingPreview } from "$preview/load-preview";

import type { HistoryBrowserContextValue, HistoryBrowserLayout } from "./history-browser-context";
import type { BrowserServices } from "./history-browser-services";
import type { BrowserState } from "./history-browser-state";

export interface HistoryBrowserProviderProperties {
	/** Every run, newest first. */
	entries: ReadonlyArray<HistoryEntry>;
	services: BrowserServices;
	children: ReactNode;
}

// The title, the footer, and the list's top and bottom borders.
const CHROME_ROWS = 4;
// The detail pane's borders and padding.
const DETAIL_CHROME_COLUMNS = 4;

function getLayout(columns: number, rows: number): HistoryBrowserLayout {
	const listHeight = Math.max(1, rows - CHROME_ROWS);
	const listWidth = Math.floor(columns / 2);
	return {
		columns,
		listHeight,
		listWidth,
		previewBox: {
			columns: Math.max(1, columns - listWidth - DETAIL_CHROME_COLUMNS),
			rows: Math.max(3, Math.floor(listHeight / 2)),
		},
		rows,
	};
}

interface ContextParts {
	readonly actions: HistoryBrowserContextValue["actions"];
	readonly browser: BrowserState;
	readonly layout: HistoryBrowserLayout;
	readonly selected?: HistoryEntry | undefined;
	readonly services: BrowserServices;
}

function createContextValue({
	actions,
	browser,
	layout,
	selected,
	services,
}: ContextParts): HistoryBrowserContextValue {
	return {
		actions,
		meta: {
			getPreview(entry): LoadingPreview | undefined {
				const [image] = entry.images;
				if (image === undefined) return undefined;

				return services.getPreview(services.resolve(image.stored), layout.previewBox);
			},
			layout,
			resolve: services.resolve,
		},
		state: {
			entries: browser.entries,
			filter: browser.filter,
			mode: browser.mode,
			runs: getVisibleRuns(browser),
			selected,
			selectedIndex: browser.cursor,
			status: browser.status,
		},
	};
}

/**
 * Owns the browser's state and side effects. Every browser part reads the
 * same `{ state, actions, meta }` from it, so no part needs props.
 *
 * @param properties - The runs, the services that act on them, and the parts.
 * @param properties.entries - Every run, newest first.
 * @param properties.children - The browser's parts.
 * @param properties.services - Opens, deletes, previews, and re-runs runs.
 * @returns The parts, with the browser context around them.
 */
export function HistoryBrowserProvider({
	entries,
	services,
	children,
}: Readonly<HistoryBrowserProviderProperties>): ReactNode {
	const [browser, dispatch] = useReducer(reduceBrowserState, entries, createBrowserState);
	const { exit } = useApp();
	const { write } = useStdout();
	const { columns, rows } = useWindowSize();
	const layout = getLayout(columns, rows);
	const selected = getSelectedRun(browser);
	const actions = createBrowserActions({ dispatch, exit, pageSize: layout.listHeight, selected, services, write });
	const value = createContextValue({ actions, browser, layout, selected, services });

	return <HistoryBrowserContext value={value}>{children}</HistoryBrowserContext>;
}
