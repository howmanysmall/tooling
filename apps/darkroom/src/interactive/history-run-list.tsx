import { Box, Text } from "ink";

import { formatCost } from "$generation/format-result";
import { formatLocalDateTime, previewPrompt } from "$history/format-history";
import { SHORT_ID_LENGTH } from "$history/resolve-run-reference";

import { getVisibleRuns, getWindowStart } from "./history-browser-state";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

import type { BrowserState } from "./history-browser-state";

export interface HistoryRunListProperties {
	/** How many runs fit. */
	height: number;
	state: BrowserState;
	width: number;
}

function formatRunRow(entry: HistoryEntry): string {
	const cost = entry.cost === undefined ? "?" : formatCost(entry.cost);
	const parts = [entry.id.slice(0, SHORT_ID_LENGTH), formatLocalDateTime(entry.created), entry.model, cost];
	return `${parts.join("  ")}  ${previewPrompt(entry.prompt, 80)}`;
}

/**
 * The browser's left pane: one line per visible run, scrolled to keep the
 * selected one in view.
 *
 * @param properties - The pane's size and the browser state.
 * @param properties.height - How many runs fit.
 * @param properties.state - The runs, filter, and cursor.
 * @param properties.width - The pane's width in columns.
 * @returns A bordered box with one row per shown run.
 */
export function HistoryRunList({ height, state, width }: Readonly<HistoryRunListProperties>): ReactNode {
	const runs = getVisibleRuns(state);
	const start = getWindowStart(state.cursor, runs.length, height);
	const shown = runs.slice(start, start + height);
	const emptyText = state.entries.length === 0 ? "No runs yet." : "No runs match.";
	return (
		<Box borderStyle="round" flexDirection="column" flexShrink={0} height={height + 2} width={width}>
			{shown.length === 0 ? <Text dimColor={true}>{emptyText}</Text> : null}
			{shown.map((entry, index) => (
				<Text key={entry.id} inverse={start + index === state.cursor} wrap="truncate-end">
					{formatRunRow(entry)}
				</Text>
			))}
		</Box>
	);
}
