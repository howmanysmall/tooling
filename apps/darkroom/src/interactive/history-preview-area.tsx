import { Box } from "ink";

import { HistoryBatchStrip } from "./history-batch-strip";
import { useHistoryBrowser } from "./history-browser-context";
import { PreviewSlot } from "./preview-slot";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

function compareByModel(first: HistoryEntry, second: HistoryEntry): number {
	return first.model.localeCompare(second.model);
}

/**
 * The top of the detail pane: the selected run's comparison side by side
 * when it came from `compare`, otherwise its own first image.
 *
 * @returns The images, or nothing when the run has none or previews are off.
 */
export function HistoryPreviewArea(): ReactNode {
	const {
		meta,
		state: { relations, selected },
	} = useHistoryBrowser();
	if (selected === undefined) return null;

	const batch = relations?.batch ?? [];
	if (batch.length > 0) {
		return (
			<Box flexShrink={0} justifyContent="center">
				<HistoryBatchStrip runs={[selected, ...batch].toSorted(compareByModel)} />
			</Box>
		);
	}

	const preview = meta.getPreview(selected);
	if (preview === undefined) return null;

	return (
		<Box flexShrink={0} justifyContent="center">
			<PreviewSlot preview={preview} />
		</Box>
	);
}
