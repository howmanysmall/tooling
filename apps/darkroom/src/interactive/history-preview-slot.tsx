import { Suspense } from "react";
import { Text } from "ink";

import { HistoryImagePreview } from "./history-image-preview";

import type { ReactNode } from "react";

import type { LoadingPreview } from "$preview/load-preview";

const LOADING = <Text dimColor={true}>{"Loading preview…"}</Text>;

export interface HistoryPreviewSlotProperties {
	preview: LoadingPreview;
}

/**
 * An image preview with its own loading placeholder, so each image appears
 * as soon as it is ready.
 *
 * @param properties - The preview to show.
 * @param properties.preview - Resolves to the preview lines or a message.
 * @returns The preview, or the placeholder while it loads.
 */
export function HistoryPreviewSlot({ preview }: Readonly<HistoryPreviewSlotProperties>): ReactNode {
	return (
		<Suspense fallback={LOADING}>
			<HistoryImagePreview preview={preview} />
		</Suspense>
	);
}
