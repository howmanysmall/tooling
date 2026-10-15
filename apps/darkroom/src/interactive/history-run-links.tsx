import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { getRunLinks } from "./run-facts";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { RunRelations } from "$history/resolve-run-reference";

export interface HistoryRunLinksProperties {
	entry: HistoryEntry;
	relations: RunRelations;
}

const LABEL_WIDTH = 11;

/**
 * Where a run's files are and which runs it relates to, one labelled line
 * each, ending with its full ID.
 *
 * @param properties - The run and its relations.
 * @param properties.entry - The run whose files and links to show.
 * @param properties.relations - Its parents and the other runs of its comparison.
 * @returns The labelled lines; each keeps its height so a long list is clipped
 *   at the bottom instead of overlapping.
 */
export function HistoryRunLinks({ entry, relations }: Readonly<HistoryRunLinksProperties>): ReactNode {
	const {
		meta: { resolve },
	} = useHistoryBrowser();

	return (
		<Box flexDirection="column" flexShrink={0}>
			{getRunLinks(entry, relations, resolve).map(({ label, value }) => (
				<Box key={`${label}:${value}`} flexShrink={0}>
					<Box flexShrink={0} width={LABEL_WIDTH}>
						<Text color={theme.muted}>{label}</Text>
					</Box>
					<Text dimColor={label === "id"} wrap="truncate-middle">
						{value}
					</Text>
				</Box>
			))}
		</Box>
	);
}
