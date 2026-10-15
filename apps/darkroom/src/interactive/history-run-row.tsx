import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { Box, Text } from "ink";

import { previewPrompt } from "$history/format-history";

import { useHistoryBrowser } from "./history-browser-context";
import { useMouseTarget } from "./mouse-context";
import { getRowBackground } from "./row-background";
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
 * One run in the list: the prompt, then its model, time, and cost. A
 * comparison is one row, marked with how many models it compared. The
 * selected run gets the accent bar and a bold prompt; the one under the
 * pointer is lit, and a click selects it.
 *
 * @param properties - What to list.
 * @param properties.entry - A history entry, shown by its prompt.
 * @returns Two lines.
 */
export function HistoryRunRow({ entry }: Readonly<HistoryRunRowProperties>): ReactNode {
	const {
		actions: { selectRun },
		state: { batchSizes, selected },
	} = useHistoryBrowser();
	const { attachNode, isHovered } = useMouseTarget(`run:${entry.id}`, {
		onClick(): void {
			selectRun(entry.id);
		},
	});
	const isSelected = entry.id === selected?.id;
	const bar = isSelected ? "▌ " : "  ";
	const batchSize = entry.batch === undefined ? undefined : batchSizes.get(entry.batch);

	return (
		<Box
			ref={attachNode}
			backgroundColor={getRowBackground(isSelected, isHovered)}
			flexDirection="column"
			flexShrink={0}
		>
			<Text wrap="truncate-end">
				<Text color={theme.accent}>{bar}</Text>
				<Text bold={isSelected}>{previewPrompt(entry.prompt, MAX_PROMPT_LENGTH)}</Text>
			</Text>
			<Text wrap="truncate-end">
				<Text color={theme.accent}>{bar}</Text>
				<Text color={theme.muted}>{describeRunLine(entry)}</Text>
				{batchSize === undefined ? null : (
					<Text color={theme.accent}>{`  ◫ ${batchSize} ${toPlural(batchSize, "model")}`}</Text>
				)}
			</Text>
		</Box>
	);
}
