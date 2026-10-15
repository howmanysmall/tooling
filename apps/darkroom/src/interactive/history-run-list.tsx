import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryDayHeading } from "./history-day-heading";
import { HistoryRunRow } from "./history-run-row";
import { buildRunListItems, getVisibleItems } from "./run-list-layout";
import { theme } from "./theme";

import type { ReactNode } from "react";

/**
 * The left pane: runs grouped by day, newest first, scrolled to keep the
 * selected run in view.
 *
 * @returns A bordered pane of day headings and two-line runs.
 */
export function HistoryRunList(): ReactNode {
	const {
		meta: { layout, now },
		state,
	} = useHistoryBrowser();
	const items = getVisibleItems(buildRunListItems(state.runs, now), state.selectedIndex, layout.listHeight);
	const emptyText = state.entries.length === 0 ? "No runs yet. Make one with darkroom generate." : "No runs match.";

	return (
		<Box
			borderColor={theme.border}
			borderStyle="round"
			flexDirection="column"
			flexShrink={0}
			height={layout.listHeight + 2}
			paddingX={1}
			width={layout.listWidth}
		>
			{items.length === 0 ? <Text color={theme.muted}>{emptyText}</Text> : null}
			{items.map((item) =>
				item.kind === "day" ? (
					<HistoryDayHeading key={item.key} label={item.label} />
				) : (
					<HistoryRunRow key={item.key} entry={item.entry} />
				),
			)}
		</Box>
	);
}
