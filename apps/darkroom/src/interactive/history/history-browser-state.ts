import { clampCursor, isCursorMove, moveCursor } from "$interactive/components/list-cursor";
import { reduceStatus } from "$interactive/components/status-message";

import type { HistoryEntry } from "$history/history-entry";
import type { CursorMove } from "$interactive/components/list-cursor";
import type { StatusAction, StatusMessage } from "$interactive/components/status-message";

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
	/** The run shown for each comparison batch, by batch ID. */
	readonly picks: ReadonlyMap<string, string>;
	readonly status?: StatusMessage | undefined;
}

export const enum BrowserActionType {
	StepBatch = 5,
	Filter = 6,
	Removed = 7,
	Select = 8,
	Mode = 9,
	CancelFilter = 10,
}

export type BrowserAction =
	| CursorMove
	| StatusAction
	| { readonly delta: number; readonly type: BrowserActionType.StepBatch }
	| { readonly filter: string; readonly type: BrowserActionType.Filter }
	| { readonly id: string; readonly type: BrowserActionType.Removed }
	| { readonly id: string; readonly type: BrowserActionType.Select }
	| { readonly mode: BrowserMode; readonly type: BrowserActionType.Mode }
	| { readonly type: BrowserActionType.CancelFilter };

export function createBrowserState(entries: ReadonlyArray<HistoryEntry>): BrowserState {
	return { cursor: 0, entries, filter: "", mode: BrowserMode.Normal, picks: new Map() };
}

function matchesFilter(entry: HistoryEntry, filter: string): boolean {
	return entry.prompt.toLowerCase().includes(filter) || entry.model.toLowerCase().includes(filter);
}

/**
 * Gets every run that matches the filter, newest first, with each run of a
 * comparison counted on its own.
 *
 * @param state - The browser state.
 * @returns The runs the footer counts and totals.
 */
export function getMatchingRuns(state: BrowserState): ReadonlyArray<HistoryEntry> {
	if (state.filter.length === 0) return state.entries;
	return state.entries.filter((entry) => matchesFilter(entry, state.filter));
}

function compareByModel(first: HistoryEntry, second: HistoryEntry): number {
	return first.model.localeCompare(second.model);
}

/**
 * Groups the runs that match the filter by comparison batch.
 *
 * @param state - The browser state.
 * @returns Each batch's matching runs, sorted by model, as the strip
 *   shows them.
 */
export function getBatchRuns(state: BrowserState): Map<string, Array<HistoryEntry>> {
	const batches = new Map<string, Array<HistoryEntry>>();
	for (const entry of getMatchingRuns(state)) {
		if (entry.batch === undefined) continue;
		const runs = batches.get(entry.batch) ?? [];
		runs.push(entry);
		batches.set(entry.batch, runs);
	}
	for (const runs of batches.values()) runs.sort(compareByModel);
	return batches;
}

function pickRun(state: BrowserState, batch: string, runs: ReadonlyArray<HistoryEntry>): HistoryEntry | undefined {
	const picked = state.picks.get(batch);
	return runs.find((entry) => entry.id === picked) ?? runs[0];
}

/**
 * Gets the rows to list: the runs that match the filter, newest first, with
 * each comparison batch as one row showing its picked run.
 *
 * @param state - The browser state.
 * @returns The runs to list.
 */
export function getVisibleRuns(state: BrowserState): ReadonlyArray<HistoryEntry> {
	const batches = getBatchRuns(state);
	const listed = new Set<string>();
	const rows: Array<HistoryEntry> = [];
	for (const entry of getMatchingRuns(state)) {
		if (entry.batch === undefined) {
			rows.push(entry);
		} else if (!listed.has(entry.batch)) {
			listed.add(entry.batch);
			rows.push(pickRun(state, entry.batch, batches.get(entry.batch) ?? []) ?? entry);
		}
	}
	return rows;
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

/**
 * Shows the previous or next run of the selected comparison batch, in the
 * strip's order, stopping at either end.
 *
 * @param state - The browser state.
 * @param delta - `-1` for the previous run, `1` for the next.
 * @returns The state with the batch's pick moved, or the same state when
 *   the selection isn't in a batch or is already at that end.
 */
function stepBatch(state: BrowserState, delta: number): BrowserState {
	const selected = getSelectedRun(state);
	if (selected?.batch === undefined) return state;

	const runs = getBatchRuns(state).get(selected.batch) ?? [];
	const index = runs.findIndex((entry) => entry.id === selected.id);
	const next = runs[clampCursor(index + delta, runs.length)];
	if (next === undefined || next.id === selected.id) return state;

	return { ...state, picks: new Map(state.picks).set(selected.batch, next.id) };
}

/**
 * Selects a run, as a click does. A run in a comparison becomes the one
 * its row shows.
 *
 * @param state - The browser state.
 * @param id - Which run to put the cursor on.
 * @returns The state with the cursor on the run, or the same state when it
 *   isn't listed.
 */
function selectRun(state: BrowserState, id: string): BrowserState {
	const entry = state.entries.find((item) => item.id === id);
	if (entry === undefined) return state;

	const picks = entry.batch === undefined ? state.picks : new Map(state.picks).set(entry.batch, id);
	const next = { ...state, picks };
	const index = getVisibleRuns(next).findIndex((item) => item.id === id);
	return index === -1 ? state : { ...next, cursor: index };
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
	if (isCursorMove(action)) return reduceNavigation(state, action);
	switch (action.type) {
		case BrowserActionType.CancelFilter:
			return { ...state, cursor: 0, filter: "", mode: BrowserMode.Normal };

		case BrowserActionType.Filter:
			return setFilter(state, action.filter);

		case BrowserActionType.Mode:
			return { ...state, mode: action.mode };

		case BrowserActionType.Removed:
			return removeRun(state, action.id);

		case BrowserActionType.Select:
			return selectRun(state, action.id);

		case BrowserActionType.StepBatch:
			return stepBatch(state, action.delta);

		default:
			return { ...state, status: reduceStatus(state.status, action) };
	}
}
