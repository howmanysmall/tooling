import { Box, Text } from "ink";

import { formatCost } from "$generation/format-result";
import { formatLocalDateTime, previewPrompt } from "$history/format-history";
import { SHORT_ID_LENGTH } from "$history/resolve-run-reference";

import { useHistoryBrowser } from "./history-browser-context";
import { getWindowStart } from "./history-browser-state";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

function formatRunRow(entry: HistoryEntry): string {
	const cost = entry.cost === undefined ? "?" : formatCost(entry.cost);
	const parts = [entry.id.slice(0, SHORT_ID_LENGTH), formatLocalDateTime(entry.created), entry.model, cost];
	return `${parts.join("  ")}  ${previewPrompt(entry.prompt, 80)}`;
}

/**
 * The left pane: one line per visible run, scrolled to keep the selected one
 * in view.
 *
 * @returns A bordered box with one row per shown run.
 */
export function HistoryRunList(): ReactNode {
	const {
		meta: { layout },
		state,
	} = useHistoryBrowser();
	const start = getWindowStart(state.selectedIndex, state.runs.length, layout.listHeight);
	const shown = state.runs.slice(start, start + layout.listHeight);
	const emptyText = state.entries.length === 0 ? "No runs yet." : "No runs match.";

	return (
		<Box
			borderStyle="round"
			flexDirection="column"
			flexShrink={0}
			height={layout.listHeight + 2}
			width={layout.listWidth}
		>
			{shown.length === 0 ? <Text dimColor={true}>{emptyText}</Text> : null}
			{shown.map((entry) => (
				<Text key={entry.id} inverse={entry.id === state.selected?.id} wrap="truncate-end">
					{formatRunRow(entry)}
				</Text>
			))}
		</Box>
	);
}
