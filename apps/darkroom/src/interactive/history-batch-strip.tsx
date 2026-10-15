import { Box } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryStripCell } from "./history-strip-cell";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";

const COLUMN_GAP = 1;

function getCellBox(columns: number, rows: number): CellBox {
	// One row under each image holds its model.
	return { columns, rows: Math.max(2, rows - 1) };
}

/**
 * The selected run's comparison: every model's image side by side, ordered
 * by model, sharing the detail pane's preview space.
 *
 * @param properties - The runs of the comparison.
 * @param properties.runs - Every run of the comparison, the selected one included.
 * @returns A row of images with their models underneath.
 */
export function HistoryBatchStrip({ runs }: Readonly<{ runs: ReadonlyArray<HistoryEntry> }>): ReactNode {
	const {
		meta: { layout },
	} = useHistoryBrowser();
	const { previewBox } = layout;
	const width = Math.floor((previewBox.columns - COLUMN_GAP * (runs.length - 1)) / runs.length);
	const box = getCellBox(Math.max(1, width), previewBox.rows);

	return (
		<Box columnGap={COLUMN_GAP} flexShrink={0}>
			{runs.map((run) => (
				<HistoryStripCell key={run.id} box={box} run={run} />
			))}
		</Box>
	);
}
