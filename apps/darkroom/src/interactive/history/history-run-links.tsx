import { FactLines } from "$interactive/components/fact-lines";

import { useHistoryBrowser } from "./history-browser-context";
import { getRunLinks } from "./run-facts";
import { useRunImageActions } from "./use-run-image-actions";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { RunRelations } from "$history/resolve-run-reference";

export interface HistoryRunLinksProperties {
	entry: HistoryEntry;
	relations: RunRelations;
}

const LABEL_WIDTH = 11;

/**
 * Where a run's files are and which runs it relates to, one labeled line
 * each, ending with its full ID. Clicking a file opens its actions.
 *
 * @param properties - The run and its relations.
 * @param properties.entry - The run whose files and links to show.
 * @param properties.relations - Its parents and the other runs of its comparison.
 * @returns The labeled lines.
 */
export function HistoryRunLinks({ entry, relations }: Readonly<HistoryRunLinksProperties>): ReactNode {
	const {
		meta: { resolve },
	} = useHistoryBrowser();
	const showImage = useRunImageActions();

	return (
		<FactLines
			facts={getRunLinks(entry, relations, resolve)}
			labelWidth={LABEL_WIDTH}
			overflow="truncate-middle"
			onOpenImage={showImage}
		/>
	);
}
