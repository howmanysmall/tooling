import { createContext, use } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { RunRelations } from "$history/resolve-run-reference";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { BrowserMode } from "./history-browser-state";
import type { StatusMessage } from "./status-message";

export interface HistoryBrowserState {
	/** How many listed runs each comparison batch has, by batch ID. */
	readonly batchSizes: ReadonlyMap<string, number>;
	/** Every run, newest first, including filtered-out ones. */
	readonly entries: ReadonlyArray<HistoryEntry>;
	/** Lowercase filter text, empty when unfiltered. */
	readonly filter: string;
	/** Every run that matches the filter, with comparisons counted per run. */
	readonly matching: ReadonlyArray<HistoryEntry>;
	readonly mode: BrowserMode;
	/** The selected run's parents and comparison runs, if a run is selected. */
	readonly relations?: RunRelations | undefined;
	/** The rows to list, newest first, one per comparison. */
	readonly runs: ReadonlyArray<HistoryEntry>;
	/** The run under the cursor, if any. */
	readonly selected?: HistoryEntry | undefined;
	/** Index of `selected` within `runs`. */
	readonly selectedIndex: number;
	/** A one-line message for the footer, such as a copied ID. */
	readonly status?: StatusMessage | undefined;
}

export interface HistoryBrowserActions {
	/** Answers the delete question: `y` deletes, anything else keeps. */
	readonly answerDelete: (answer: string) => void;
	readonly askDelete: () => void;
	readonly cancelFilter: () => void;
	readonly closeFilter: () => void;
	readonly copySelected: () => void;
	readonly moveDown: () => void;
	readonly movePageDown: () => void;
	readonly movePageUp: () => void;
	readonly moveToFirst: () => void;
	readonly moveToLast: () => void;
	readonly moveUp: () => void;
	readonly openFilter: () => void;
	readonly openSelected: () => void;
	readonly quit: () => void;
	/** Sends the selected run to the generate session, which confirms it. */
	readonly rerunSelected: () => void;
	readonly setFilter: (text: string) => void;
	/** Shows the next model's run in the selected comparison. */
	readonly showNextInBatch: () => void;
	/** Shows the previous model's run in the selected comparison. */
	readonly showPreviousInBatch: () => void;
}

export interface HistoryBrowserLayout {
	readonly columns: number;
	/** Rows of runs the list can show. */
	readonly listHeight: number;
	readonly listWidth: number;
	/** The most cells an image preview may use. */
	readonly previewBox: CellBox;
	readonly rows: number;
}

export interface HistoryBrowserMeta {
	/** A run's first image, sized for the detail pane unless a box is given. */
	readonly getPreview: (entry: HistoryEntry, box?: CellBox) => LoadingPreview | undefined;
	readonly layout: HistoryBrowserLayout;
	/** When the browser opened, for naming days like `Today`. */
	readonly now: Date;
	/** Turns a stored path into an absolute one. */
	readonly resolve: (stored: string) => string;
}

/**
 * What every browser component reads. The provider is the only place that
 * knows how the state is kept; components only see this interface.
 */
export interface HistoryBrowserContextValue {
	readonly actions: HistoryBrowserActions;
	readonly meta: HistoryBrowserMeta;
	readonly state: HistoryBrowserState;
}

export const HistoryBrowserContext = createContext<HistoryBrowserContextValue | undefined>(undefined);
HistoryBrowserContext.displayName = "HistoryBrowserContext";

/**
 * Reads the browser's state, actions, and layout.
 *
 * @returns The context value from the nearest provider.
 * @throws {Error} When used outside `HistoryBrowser.Provider`.
 */
export function useHistoryBrowser(): HistoryBrowserContextValue {
	const value = use(HistoryBrowserContext);
	if (value === undefined) throw new Error("useHistoryBrowser must be used inside HistoryBrowser.Provider.");

	return value;
}
