import { Box, Text } from "ink";

import { previewPrompt } from "$history/format-history";

import { useHistoryBrowser } from "./history-browser-context";
import { describeRunLine } from "./run-facts";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

// Longer than any pane is wide; the row cuts the rest.
const MAX_PROMPT_LENGTH = 400;

export interface HistoryRunRowProperties {
	entry: HistoryEntry;
}

/**
 * One run in the list: the prompt, then its model, time, and cost. The
 * selected run gets the accent bar and a bold prompt.
 *
 * @param properties - What to list.
 * @param properties.entry - A history entry, shown by its prompt.
 * @returns Two lines.
 */
export function HistoryRunRow({ entry }: Readonly<HistoryRunRowProperties>): ReactNode {
	const {
		state: { selected },
	} = useHistoryBrowser();
	const isSelected = entry.id === selected?.id;
	const bar = isSelected ? "▌ " : "  ";

	return (
		<Box flexDirection="column" flexShrink={0}>
			<Text wrap="truncate-end">
				<Text color={theme.accent}>{bar}</Text>
				<Text bold={isSelected}>{previewPrompt(entry.prompt, MAX_PROMPT_LENGTH)}</Text>
			</Text>
			<Text wrap="truncate-end">
				<Text color={theme.accent}>{bar}</Text>
				<Text color={theme.muted}>{describeRunLine(entry)}</Text>
				{entry.batch === undefined ? null : <Text color={theme.accent}>{"  ◫ compare"}</Text>}
			</Text>
		</Box>
	);
}
