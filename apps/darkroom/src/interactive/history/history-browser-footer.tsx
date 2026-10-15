import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatCost } from "$generation/format-result";
import { StatusBar } from "$interactive/components/status-bar";

import { useHistoryBrowser } from "./history-browser-context";
import { BrowserMode } from "./history-browser-state";
import { getHistoryCommands } from "./history-commands";
import { HistoryFilterBar } from "./history-filter-bar";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

function getTotalCost(runs: ReadonlyArray<HistoryEntry>): number {
	let total = 0;
	for (const { cost } of runs) total += cost ?? 0;
	return total;
}

/**
 * The bottom line: the main keys, or the filter while it is open, then how
 * many runs are shown and what they cost.
 *
 * @returns The history browser's status bar.
 */
export function HistoryBrowserFooter(): ReactNode {
	const { actions, state } = useHistoryBrowser();
	const shown = state.matching.length;
	const total = state.entries.length;
	const counts =
		state.filter.length === 0
			? `${shown} ${toPlural(shown, "run")}`
			: `${shown} of ${total} ${toPlural(total, "run")}`;

	return (
		<StatusBar
			commands={getHistoryCommands(actions)}
			summary={`${counts} · ${formatCost(getTotalCost(state.matching))}`}
		>
			{state.mode === BrowserMode.Filter ? <HistoryFilterBar /> : null}
		</StatusBar>
	);
}
