import type { HistoryEntry } from "$history/history-entry";

export const enum BrowserMode {
	/** Asking whether to delete the selected run. */
	ConfirmDelete = "confirm-delete",
	/** Typing into the filter. */
	Filter = "filter",
	Normal = "normal",
}

export interface BrowserState {
	/** Index of the selected run within the visible ones. */
	readonly cursor: number;
	/** Every run, newest first. */
	readonly entries: ReadonlyArray<HistoryEntry>;
	/** Lowercase text the prompt or model must contain. */
	readonly filter: string;
	readonly mode: BrowserMode;
	/** A one-line message for the footer, such as a copied ID. */
	readonly status?: string | undefined;
}

type NavigationAction =
	| { readonly delta: number; readonly type: "move" }
	| { readonly type: "first" }
	| { readonly type: "last" };

export type BrowserAction =
	| NavigationAction
	| { readonly filter: string; readonly type: "filter" }
	| { readonly id: string; readonly type: "removed" }
	| { readonly mode: BrowserMode; readonly type: "mode" }
	| { readonly status: string | undefined; readonly type: "status" }
	| { readonly type: "cancel-filter" };

export function createBrowserState(entries: ReadonlyArray<HistoryEntry>): BrowserState {
	return { cursor: 0, entries, filter: "", mode: BrowserMode.Normal };
}

function matchesFilter(entry: HistoryEntry, filter: string): boolean {
	return entry.prompt.toLowerCase().includes(filter) || entry.model.toLowerCase().includes(filter);
}

/**
 * Gets the runs that match the filter, newest first.
 *
 * @param state - The browser state.
 * @returns The runs to list.
 */
export function getVisibleRuns(state: BrowserState): ReadonlyArray<HistoryEntry> {
	if (state.filter === "") return state.entries;
	return state.entries.filter((entry) => matchesFilter(entry, state.filter));
}

/**
 * Gets the selected run.
 *
 * @param state - The browser state.
 * @returns The run under the cursor, or `undefined` when nothing is listed.
 */
export function getSelectedRun(state: BrowserState): HistoryEntry | undefined {
	return getVisibleRuns(state)[state.cursor];
}

function clampCursor(cursor: number, count: number): number {
	return Math.max(0, Math.min(cursor, count - 1));
}

function isNavigation(action: BrowserAction): action is NavigationAction {
	return action.type === "move" || action.type === "first" || action.type === "last";
}

function reduceNavigation(state: BrowserState, action: NavigationAction): BrowserState {
	const count = getVisibleRuns(state).length;
	const target = action.type === "move" ? state.cursor + action.delta : 0;
	const cursor = action.type === "last" ? count - 1 : target;
	return { ...state, cursor: clampCursor(cursor, count), status: undefined };
}

function setFilter(state: BrowserState, filter: string): BrowserState {
	// The filter input reports its text from an effect, which can land after
	// the filter was cancelled.
	if (state.mode !== BrowserMode.Filter) return state;
	return { ...state, cursor: 0, filter: filter.trim().toLowerCase() };
}

function removeRun(state: BrowserState, id: string): BrowserState {
	const next = { ...state, entries: state.entries.filter((entry) => entry.id !== id), mode: BrowserMode.Normal };
	return { ...next, cursor: clampCursor(state.cursor, getVisibleRuns(next).length) };
}

/**
 * Applies one browser action. Pure, so every key binding can be tested
 * without a terminal.
 *
 * @param state - The current state.
 * @param action - What happened.
 * @returns The next state.
 */
export function reduceBrowserState(state: BrowserState, action: BrowserAction): BrowserState {
	if (isNavigation(action)) return reduceNavigation(state, action);
	switch (action.type) {
		case "cancel-filter": {
			return { ...state, cursor: 0, filter: "", mode: BrowserMode.Normal };
		}

		case "filter": {
			return setFilter(state, action.filter);
		}

		case "mode": {
			return { ...state, mode: action.mode, status: undefined };
		}

		case "removed": {
			return removeRun(state, action.id);
		}

		default:
			return { ...state, status: action.status };
	}
}

/**
 * Works out the first row to show so the cursor stays in view, keeping it
 * near the middle while there is room.
 *
 * @param cursor - The selected index.
 * @param count - How many rows there are.
 * @param height - How many rows fit.
 * @returns The index of the first visible row.
 */
export function getWindowStart(cursor: number, count: number, height: number): number {
	if (height <= 0 || count <= height) return 0;
	return Math.max(0, Math.min(cursor - Math.floor(height / 2), count - height));
}
