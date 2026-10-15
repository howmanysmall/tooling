import { Box, Text } from "ink";

import { removeControlCharacters } from "$utilities/text-utilities";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryPreviewArea } from "./history-preview-area";
import { HistoryRunLinks } from "./history-run-links";
import { HistoryRunStats } from "./history-run-stats";
import { theme } from "./theme";

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
	if (selected === undefined) {
		return (
			<Box
				alignItems="center"
				borderColor={theme.border}
				borderStyle="round"
				flexGrow={1}
				justifyContent="center"
			>
				<Text color={theme.muted}>{"Nothing selected"}</Text>
			</Box>
		);
	}

	return (
		<Box
			borderColor={theme.border}
			borderStyle="round"
			flexDirection="column"
			flexGrow={1}
			overflow="hidden"
			paddingX={2}
			paddingY={1}
			rowGap={1}
		>
			<HistoryPreviewArea />
			<Box flexShrink={0}>
				<Text bold={true}>{removeControlCharacters(selected.prompt)}</Text>
			</Box>
			<HistoryRunStats entry={selected} />
			<HistoryRunLinks entry={selected} relations={state.relations ?? NO_RELATIONS} />
		</Box>
	);
}
