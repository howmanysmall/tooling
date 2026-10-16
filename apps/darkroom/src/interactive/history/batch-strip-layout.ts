import { getStripWindow } from "$interactive/components/strip-window";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";

export const COLUMN_GAP = 1;
// Narrower than this and an image is too small to make out.
const MIN_CELL_COLUMNS = 24;
// Room for `‹ 12` and `18 ›` when the comparison doesn't fit.
export const MARKER_COLUMNS = 5;

/** Which runs of a comparison the strip shows, and how big. */
export interface BatchStripPlan {
	/** Runs left out after the shown ones. */
	readonly after: number;
	/** Runs left out before the shown ones. */
	readonly before: number;
	/** The cells each image may use. */
	readonly box: CellBox;
	readonly shown: ReadonlyArray<HistoryEntry>;
}

function compareByModel(first: HistoryEntry, second: HistoryEntry): number {
	return first.model.localeCompare(second.model);
}

/**
 * Orders a comparison as its strip shows it: every run, by model.
 *
 * @param selected - The run whose comparison it is.
 * @param batch - The comparison's other runs.
 * @returns All of its runs, by model.
 */
export function getComparisonRuns(selected: HistoryEntry, batch: ReadonlyArray<HistoryEntry>): Array<HistoryEntry> {
	return [selected, ...batch].toSorted(compareByModel);
}

function getCapacity(columns: number, count: number): number {
	const fits = Math.floor((columns + COLUMN_GAP) / (MIN_CELL_COLUMNS + COLUMN_GAP));
	if (fits >= count) return count;

	return Math.floor((columns - MARKER_COLUMNS * 2 + COLUMN_GAP) / (MIN_CELL_COLUMNS + COLUMN_GAP));
}

/**
 * Fits a comparison into the preview area: as many images side by side as
 * stay readable, around the selected run, with the rest counted.
 *
 * @param runs - Every run of the comparison, by model.
 * @param selectedId - The selected run's ID.
 * @param previewBox - The cells the whole strip may use.
 * @returns The runs shown, the cells for each, and how many are left out.
 */
export function planBatchStrip(
	runs: ReadonlyArray<HistoryEntry>,
	selectedId: string | undefined,
	previewBox: CellBox,
): BatchStripPlan {
	const selectedIndex = runs.findIndex((run) => run.id === selectedId);
	const { after, before, shown } = getStripWindow(
		runs,
		Math.max(0, selectedIndex),
		getCapacity(previewBox.columns, runs.length),
	);
	const isClipped = before + after > 0;
	const cellsWidth = previewBox.columns - (isClipped ? MARKER_COLUMNS * 2 : 0);
	const width = Math.floor((cellsWidth - COLUMN_GAP * (shown.length - 1)) / shown.length);
	// One row under each image holds its model.
	const box = { columns: Math.max(1, width), rows: Math.max(2, previewBox.rows - 1) };
	return { after, before, box, shown };
}
