import { use } from "react";
import { Box, Text } from "ink";

import type { ReactNode } from "react";

import type { LoadingPreview } from "$preview/load-preview";

export interface ImagePreviewProperties {
	preview: LoadingPreview;
}

/**
 * Draws an image once it has loaded; the parent's Suspense boundary shows a
 * placeholder until then.
 *
 * @param properties - The loading preview.
 * @param properties.preview - Resolves to the preview lines or a message.
 * @returns The image as text cells, or why there is no image.
 */
export function ImagePreview({ preview }: Readonly<ImagePreviewProperties>): ReactNode {
	// Once loaded, it draws at once; only an image still loading suspends.
	const loaded = preview.loaded ?? use(preview.result);
	if (loaded.kind === "message") return <Text dimColor={true}>{loaded.text}</Text>;

	return (
		<Box flexShrink={0}>
			<Text wrap="truncate-end">{loaded.lines.join("\n")}</Text>
		</Box>
	);
}
