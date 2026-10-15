import { FactColumns } from "./fact-columns";
import { useHistoryBrowser } from "./history-browser-context";
import { getRunStats } from "./run-facts";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

export interface HistoryRunStatsProperties {
	entry: HistoryEntry;
}

/**
 * A run's headline facts as labelled columns.
 *
 * @param properties - What to summarize.
 * @param properties.entry - The run whose model, time, size, images, and cost to show.
 * @returns A row of labelled columns.
 */
export function HistoryRunStats({ entry }: Readonly<HistoryRunStatsProperties>): ReactNode {
	const {
		meta: { now },
	} = useHistoryBrowser();

	return <FactColumns facts={getRunStats(entry, now)} />;
}
