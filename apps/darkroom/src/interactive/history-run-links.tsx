import { FactLines } from "./fact-lines";
import { useHistoryBrowser } from "./history-browser-context";
import { getRunLinks } from "./run-facts";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { RunRelations } from "$history/resolve-run-reference";

export interface HistoryRunLinksProperties {
	entry: HistoryEntry;
	relations: RunRelations;
}

const LABEL_WIDTH = 11;

/**
 * Where a run's files are and which runs it relates to, one labelled line
 * each, ending with its full ID.
 *
 * @param properties - The run and its relations.
 * @param properties.entry - The run whose files and links to show.
 * @param properties.relations - Its parents and the other runs of its comparison.
 * @returns The labelled lines.
 */
export function HistoryRunLinks({ entry, relations }: Readonly<HistoryRunLinksProperties>): ReactNode {
	const {
		meta: { resolve },
	} = useHistoryBrowser();

	return (
		<FactLines facts={getRunLinks(entry, relations, resolve)} labelWidth={LABEL_WIDTH} overflow="truncate-middle" />
	);
}
