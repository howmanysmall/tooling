import { Box, Text } from "ink";

import { toShowRows } from "$history/format-history";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryPreviewArea } from "./history-preview-area";

import type { ReactNode } from "react";

import type { RunRelations } from "$history/resolve-run-reference";
import type { Row } from "$utilities/output-format-utilities";

const NO_RELATIONS: RunRelations = { batch: [], parents: [] };

function getLabelColumnWidth(rows: ReadonlyArray<Row>): number {
	let widest = 0;
	for (const [label] of rows) widest = Math.max(widest, label.length);
	return widest + 2;
}

/**
 * The right pane: the selected run's image (or its whole comparison, side by
 * side), then everything `history show` prints for it.
 *
 * @returns The detail pane, empty when nothing is selected.
 */
export function HistoryRunDetail(): ReactNode {
	const { meta, state } = useHistoryBrowser();
	const { selected } = state;
	if (selected === undefined) return <Box borderStyle="round" flexGrow={1} />;

	const relations = state.relations ?? NO_RELATIONS;
	const rows = toShowRows(selected, relations, meta.resolve);
	const labelWidth = getLabelColumnWidth(rows);

	return (
		<Box borderStyle="round" flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
			<HistoryPreviewArea />
			{rows.map(([label, value]) => (
				// Rows keep their height; a long run is clipped at the bottom
				// instead of its rows being squeezed on top of each other.
				<Box key={`${label}:${value}`} flexShrink={0}>
					<Box flexShrink={0} width={labelWidth}>
						<Text dimColor={true}>{label}</Text>
					</Box>
					<Text>{value}</Text>
				</Box>
			))}
		</Box>
	);
}
