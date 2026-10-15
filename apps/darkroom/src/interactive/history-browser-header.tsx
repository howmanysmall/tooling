import { Box, Text } from "ink";

import { formatCost } from "$generation/format-result";

import { useHistoryBrowser } from "./history-browser-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

function getTotalCost(runs: ReadonlyArray<HistoryEntry>): number {
	let total = 0;
	for (const { cost } of runs) total += cost ?? 0;
	return total;
}

/**
 * The top line: the brand on the left, and how many runs are shown and what
 * they cost on the right.
 *
 * @returns `◐ darkroom history` and `4 runs · $0.039`.
 */
export function HistoryBrowserHeader(): ReactNode {
	const { state } = useHistoryBrowser();
	const shown = state.runs.length;
	const counts = state.filter.length === 0 ? `${shown} runs` : `${shown} of ${state.entries.length} runs`;

	return (
		<Box justifyContent="space-between" paddingX={1}>
			<Text>
				<Text bold={true} color={theme.accent}>
					{"◐ darkroom"}
				</Text>
				<Text color={theme.muted}>{"  history"}</Text>
			</Text>
			<Text color={theme.muted}>{`${counts} · ${formatCost(getTotalCost(state.runs))}`}</Text>
		</Box>
	);
}
