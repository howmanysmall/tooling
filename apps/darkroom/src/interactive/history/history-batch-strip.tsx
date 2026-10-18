import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";

import { COLUMN_GAP, MARKER_COLUMNS, planBatchStrip } from "./batch-strip-layout";
import { useHistoryBrowser } from "./history-browser-context";
import { HistoryStripCell } from "./history-strip-cell";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

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
	const { after, before, box, shown } = planBatchStrip(runs, selected?.id, layout.previewBox);
	const isClipped = before + after > 0;

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
