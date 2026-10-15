import { clampCursor, moveCursor } from "./list-cursor";
import { reduceStatus } from "./status-message";

import type { HistoryEntry } from "$history/history-entry";

import type { CursorMove } from "./list-cursor";
import type { StatusAction, StatusMessage } from "./status-message";

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
	readonly status?: StatusMessage | undefined;
}

export type BrowserAction =
	| CursorMove
	| StatusAction
	| { readonly filter: string; readonly type: "filter" }
	| { readonly id: string; readonly type: "removed" }
	| { readonly mode: BrowserMode; readonly type: "mode" }
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
	if (state.filter.length === 0) return state.entries;
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

function isNavigation(action: BrowserAction): action is CursorMove {
	return action.type === "move" || action.type === "first" || action.type === "last";
}

function reduceNavigation(state: BrowserState, action: CursorMove): BrowserState {
	return { ...state, cursor: moveCursor(state.cursor, action, getVisibleRuns(state).length) };
}

function setFilter(state: BrowserState, filter: string): BrowserState {
	// The filter input reports its text from an effect, which can land after
	// the filter was canceled.
	if (state.mode !== BrowserMode.Filter) return state;

	// The input also re-reports unchanged text whenever its callback changes;
	// returning the same state lets React skip the render instead of looping.
	const normalized = filter.trim().toLowerCase();
	if (normalized === state.filter) return state;

	return { ...state, cursor: 0, filter: normalized };
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
		case "cancel-filter":
			return { ...state, cursor: 0, filter: "", mode: BrowserMode.Normal };

		case "filter":
			return setFilter(state, action.filter);

		case "mode":
			return { ...state, mode: action.mode };

		case "removed":
			return removeRun(state, action.id);

		default:
			return { ...state, status: reduceStatus(state.status, action) };
	}
}
