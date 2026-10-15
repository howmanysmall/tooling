import { Suspense } from "react";
import { Text } from "ink";

import { ImagePreview } from "./image-preview";

import type { ReactNode } from "react";

import type { LoadingPreview } from "$preview/load-preview";

const LOADING = <Text dimColor={true}>{"Loading preview…"}</Text>;

export interface PreviewSlotProperties {
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
export function PreviewSlot({ preview }: Readonly<PreviewSlotProperties>): ReactNode {
	return (
		<Suspense fallback={LOADING}>
			<ImagePreview preview={preview} />
		</Suspense>
	);
}
