import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryStripCell } from "./history-strip-cell";
import { getStripWindow } from "./strip-window";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";

const COLUMN_GAP = 1;
// Narrower than this and an image is too small to make out.
const MIN_CELL_COLUMNS = 24;
// Room for `‹ 12` and `18 ›` when the comparison doesn't fit.
const MARKER_COLUMNS = 5;

function getCapacity(columns: number, count: number): number {
	const fits = Math.floor((columns + COLUMN_GAP) / (MIN_CELL_COLUMNS + COLUMN_GAP));
	if (fits >= count) return count;

	return Math.floor((columns - MARKER_COLUMNS * 2 + COLUMN_GAP) / (MIN_CELL_COLUMNS + COLUMN_GAP));
}

function getCellBox(columns: number, rows: number): CellBox {
	// One row under each image holds its model.
	return { columns, rows: Math.max(2, rows - 1) };
}

/**
 * The selected run's comparison: its models' images side by side, ordered
 * by model. When there are more than fit at a readable size, it shows the
 * ones around the selected run and counts the rest.
 *
 * @param properties - The runs of the comparison.
 * @param properties.runs - Every run of the comparison, the selected one included.
 * @returns A row of images with their models underneath.
 */
export function HistoryBatchStrip({ runs }: Readonly<{ runs: ReadonlyArray<HistoryEntry> }>): ReactNode {
	const {
		meta: { layout },
		state: { selected },
	} = useHistoryBrowser();
	const { previewBox } = layout;
	const selectedIndex = runs.findIndex((run) => run.id === selected?.id);
	const { after, before, shown } = getStripWindow(
		runs,
		Math.max(0, selectedIndex),
		getCapacity(previewBox.columns, runs.length),
	);
	const isClipped = before + after > 0;
	const cellsWidth = previewBox.columns - (isClipped ? MARKER_COLUMNS * 2 : 0);
	const width = Math.floor((cellsWidth - COLUMN_GAP * (shown.length - 1)) / shown.length);
	const box = getCellBox(Math.max(1, width), previewBox.rows);

	return (
		<Box alignItems="center" columnGap={COLUMN_GAP} flexShrink={0}>
			{isClipped ? (
				<Box width={MARKER_COLUMNS}>
					<Text color={theme.muted}>{before === 0 ? "" : `‹ ${before}`}</Text>
				</Box>
			) : null}
			{shown.map((run) => (
				<HistoryStripCell key={run.id} box={box} run={run} />
			))}
			{isClipped ? (
				<Box justifyContent="flex-end" width={MARKER_COLUMNS}>
					<Text color={theme.muted}>{after === 0 ? "" : `${after} ›`}</Text>
				</Box>
			) : null}
		</Box>
	);
}
