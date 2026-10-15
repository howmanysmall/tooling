import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryPreviewSlot } from "./history-preview-slot";
import { getModelName } from "./run-facts";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";

export interface HistoryStripCellProperties {
	/** The cells the image may use. */
	box: CellBox;
	run: HistoryEntry;
}

/**
 * One run of a comparison: its first image above its model, which is
 * highlighted when it is the selected run.
 *
 * @param properties - The run and the space for its image.
 * @param properties.box - The cells the image may use.
 * @param properties.run - The run to show.
 * @returns A column as wide as the box.
 */
export function HistoryStripCell({ box, run }: Readonly<HistoryStripCellProperties>): ReactNode {
	const { meta, state } = useHistoryBrowser();
	const preview = meta.getPreview(run, box);

	return (
		<Box flexDirection="column" flexShrink={0} width={box.columns}>
			{preview === undefined ? (
				<Text color={theme.muted}>{"No image"}</Text>
			) : (
				<HistoryPreviewSlot preview={preview} />
			)}
			<Box justifyContent="center">
				{run.id === state.selected?.id ? (
					<Text bold={true} color={theme.accent} wrap="truncate-end">
						{`▲ ${getModelName(run.model)}`}
					</Text>
				) : (
					<Text color={theme.muted} wrap="truncate-end">
						{getModelName(run.model)}
					</Text>
				)}
			</Box>
		</Box>
	);
}
