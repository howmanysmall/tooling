import { Box, Text } from "ink";

import { removeControlCharacters } from "$utilities/text-utilities";

import { DetailPane } from "./detail-pane";
import { useHistoryBrowser } from "./history-browser-context";
import { HistoryPreviewArea } from "./history-preview-area";
import { HistoryRunLinks } from "./history-run-links";
import { HistoryRunStats } from "./history-run-stats";

import type { ReactNode } from "react";

import type { RunRelations } from "$history/resolve-run-reference";

const NO_RELATIONS: RunRelations = { batch: [], parents: [] };

/**
 * The right pane: the image (or the whole comparison, side by side), the
 * prompt as a heading, the run's headline facts, and its files and links.
 *
 * @returns The detail pane, with a hint when nothing is selected.
 */
export function HistoryRunDetail(): ReactNode {
	const { state } = useHistoryBrowser();
	const { selected } = state;

	return (
		<DetailPane isEmpty={selected === undefined}>
			{selected === undefined ? null : (
				<>
					<HistoryPreviewArea />
					<Box flexShrink={0}>
						<Text bold={true}>{removeControlCharacters(selected.prompt)}</Text>
					</Box>
					<HistoryRunStats entry={selected} />
					<HistoryRunLinks entry={selected} relations={state.relations ?? NO_RELATIONS} />
				</>
			)}
		</DetailPane>
	);
}
