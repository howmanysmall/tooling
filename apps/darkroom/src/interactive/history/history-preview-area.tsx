import { Box } from "ink";

import { PreviewSlot } from "$interactive/components/preview-slot";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { getComparisonRuns } from "./batch-strip-layout";
import { HistoryBatchStrip } from "./history-batch-strip";
import { useHistoryBrowser } from "./history-browser-context";
import { getImagePath } from "./run-facts";
import { useRunImageActions } from "./use-run-image-actions";

import type { ReactNode } from "react";

/**
 * The top of the detail pane: the selected run's comparison side by side
 * when it came from `compare`, otherwise its own first image, which a
 * click opens the actions for.
 *
 * @returns The images, or nothing when the run has none or previews are off.
 */
export function HistoryPreviewArea(): ReactNode {
	const {
		meta,
		state: { relations, selected },
	} = useHistoryBrowser();
	const showImage = useRunImageActions();
	const first = selected?.images[0];
	const { attachNode } = useMouseTarget("history-preview", {
		onClick(): void {
			if (first !== undefined) showImage(getImagePath(first, meta.resolve));
		},
	});
	if (selected === undefined) return null;

	const batch = relations?.batch ?? [];
	if (batch.length > 0) {
		return (
			<Box flexShrink={0} justifyContent="center">
				<HistoryBatchStrip runs={getComparisonRuns(selected, batch)} />
			</Box>
		);
	}

	const preview = meta.getPreview(selected);
	if (preview === undefined) return null;

	return (
		<Box ref={attachNode} flexShrink={0} justifyContent="center">
			<PreviewSlot preview={preview} />
		</Box>
	);
}
