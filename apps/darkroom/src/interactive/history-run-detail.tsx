import { Suspense } from "react";
import { Box, Text } from "ink";

import { toShowRows } from "$history/format-history";
import { getParentChain } from "$history/resolve-run-reference";

import { HistoryImagePreview } from "./history-image-preview";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { LoadingPreview } from "$preview/load-preview";
import type { Row } from "$utilities/output-format-utilities";

const LOADING = <Text dimColor={true}>{"Loading preview…"}</Text>;

export interface HistoryRunDetailProperties {
	/** Every run, to find the selected run's parents. */
	entries: ReadonlyArray<HistoryEntry>;
	entry: HistoryEntry | undefined;
	/** The selected run's first image, when previews are on and it has one. */
	preview?: LoadingPreview | undefined;
	resolve: (stored: string) => string;
}

function getLabelColumnWidth(rows: ReadonlyArray<Row>): number {
	let widest = 0;
	for (const [label] of rows) widest = Math.max(widest, label.length);
	return widest + 2;
}

/**
 * The browser's right pane: everything `history show` prints for the
 * selected run.
 *
 * @param properties - The selected run and how to find its files.
 * @param properties.entries - Every run, to find the selected run's parents.
 * @param properties.entry - The selected run, if any.
 * @param properties.preview - The selected run's first image, if any.
 * @param properties.resolve - Turns a stored path into an absolute one.
 * @returns The detail pane.
 */
export function HistoryRunDetail({
	entries,
	entry,
	preview,
	resolve,
}: Readonly<HistoryRunDetailProperties>): ReactNode {
	if (entry === undefined) return <Box borderStyle="round" flexGrow={1} />;
	const rows = toShowRows(entry, getParentChain(entries, entry), resolve);
	const labelWidth = getLabelColumnWidth(rows);
	return (
		<Box borderStyle="round" flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
			{preview === undefined ? null : (
				<Box flexShrink={0} marginBottom={1}>
					<Suspense fallback={LOADING}>
						<HistoryImagePreview preview={preview} />
					</Suspense>
				</Box>
			)}
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
