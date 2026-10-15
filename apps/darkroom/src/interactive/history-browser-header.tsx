import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatCost } from "$generation/format-result";

import { useHistoryBrowser } from "./history-browser-context";
import { ScreenHeader } from "./screen-header";

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
	const total = state.entries.length;
	const counts =
		state.filter.length === 0
			? `${shown} ${toPlural(shown, "run")}`
			: `${shown} of ${total} ${toPlural(total, "run")}`;

	return <ScreenHeader summary={`${counts} · ${formatCost(getTotalCost(state.runs))}`} title="history" />;
}
