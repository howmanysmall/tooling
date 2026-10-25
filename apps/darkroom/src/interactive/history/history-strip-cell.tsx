import { Box, Text } from "ink";

import { PreviewSlot } from "$interactive/components/preview-slot";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useHistoryBrowser } from "./history-browser-context";
import { getImagePath, getModelName } from "./run-facts";
import { useRunImageActions } from "./use-run-image-actions";

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
 * highlighted when it is the selected run. A click selects it, and a
 * click on the selected run opens its image's actions.
 *
 * @param properties - The run and the space for its image.
 * @param properties.box - The cells the image may use.
 * @param properties.run - The run to show.
 * @returns A column as wide as the box.
 */
export function HistoryStripCell({ box, run }: Readonly<HistoryStripCellProperties>): ReactNode {
	const { actions, meta, state } = useHistoryBrowser();
	const showImage = useRunImageActions();
	const isSelected = run.id === state.selected?.id;
	const [first] = run.images;
	const { attachNode, isHovered } = useMouseTarget(`strip:${run.id}`, {
		onClick(): void {
			if (!isSelected) {
				actions.selectRun(run.id);
			} else if (first !== undefined) {
				showImage(getImagePath(first, meta.resolve));
			}
		},
	});
	const preview = meta.getPreview(run, box);

	return (
		<Box ref={attachNode} flexDirection="column" flexShrink={0} width={box.columns}>
			{preview === undefined ? <Text color={theme.muted}>{"No image"}</Text> : <PreviewSlot preview={preview} />}
			<Box justifyContent="center">
				{isSelected ? (
					<Text bold={true} color={theme.accent} wrap="truncate-end">
						{`▲ ${getModelName(run.model)}`}
					</Text>
				) : (
					<Text color={isHovered ? theme.text : theme.muted} wrap="truncate-end">
						{getModelName(run.model)}
					</Text>
				)}
			</Box>
		</Box>
	);
}
