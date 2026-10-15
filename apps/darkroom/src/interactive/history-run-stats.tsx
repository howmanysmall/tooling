import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { getRunStats } from "./run-facts";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

export interface HistoryRunStatsProperties {
	entry: HistoryEntry;
}

/**
 * A run's headline facts as small columns, each a muted label over its
 * value. They wrap onto a second row in narrow panes.
 *
 * @param properties - What to summarize.
 * @param properties.entry - The run whose model, time, size, images, and cost to show.
 * @returns A row of labelled columns.
 */
export function HistoryRunStats({ entry }: Readonly<HistoryRunStatsProperties>): ReactNode {
	const {
		meta: { now },
	} = useHistoryBrowser();

	return (
		<Box columnGap={4} flexShrink={0} flexWrap="wrap" rowGap={1}>
			{getRunStats(entry, now).map(({ label, value }) => (
				<Box key={label} flexDirection="column" flexShrink={0}>
					<Text color={theme.muted}>{label.toUpperCase()}</Text>
					<Text>{value}</Text>
				</Box>
			))}
		</Box>
	);
}
