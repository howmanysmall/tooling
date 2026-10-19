import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { Box, Text } from "ink";

import { previewPrompt } from "$history/format-history";
import { MarqueeText } from "$interactive/components/marquee-text";
import { getRowBackground } from "$interactive/components/row-background";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useHistoryBrowser } from "./history-browser-context";
import { describeRunLine } from "./run-facts";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { StyledRun } from "$interactive/components/marquee";

function getPromptRuns(entry: HistoryEntry, isSelected: boolean): Array<StyledRun> {
	return [{ color: theme.text, isBold: isSelected, text: previewPrompt(entry.prompt, Number.POSITIVE_INFINITY) }];
}

function getFactRuns(entry: HistoryEntry, batchSize?: number): Array<StyledRun> {
	const runs: Array<StyledRun> = [{ color: theme.muted, text: describeRunLine(entry) }];
	if (batchSize !== undefined) {
		runs.push({ color: theme.accent, text: `  ◫ ${batchSize} ${toPlural(batchSize, "model")}` });
	}
	return runs;
}

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
	const isScrolling = isSelected || isHovered;
	const promptRuns = getPromptRuns(entry, isSelected);
	const factRuns = getFactRuns(entry, batchSize);

	return (
		<Box
			ref={attachNode}
			backgroundColor={getRowBackground(isSelected, isHovered)}
			flexDirection="column"
			flexShrink={0}
		>
			<Box>
				<Text color={theme.accent}>{bar}</Text>
				<MarqueeText isScrolling={isScrolling} runs={promptRuns} />
			</Box>
			<Box>
				<Text color={theme.accent}>{bar}</Text>
				<MarqueeText isScrolling={isScrolling} runs={factRuns} />
			</Box>
		</Box>
	);
}
