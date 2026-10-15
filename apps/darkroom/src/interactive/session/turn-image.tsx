import { Box } from "ink";

import { PreviewSlot } from "$interactive/components/preview-slot";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { useSession } from "./session-context";

import type { ReactNode } from "react";

import type { LoadingPreview } from "$preview/load-preview";

import type { BaseImage } from "./session-state";

export interface TurnImageProperties {
	/** The saved image. */
	image: BaseImage;
	preview: LoadingPreview;
	/** The columns it takes. */
	width: number;
}

/**
 * One image a turn made. Clicking it makes it the image the next prompt
 * edits, which branches the session from there.
 *
 * @param properties - The image, its preview, and its width.
 * @param properties.image - Where it was saved, and its media type.
 * @param properties.preview - Its preview, loading.
 * @param properties.width - The columns it takes.
 * @returns The preview.
 */
export function TurnImage({ image, preview, width }: Readonly<TurnImageProperties>): ReactNode {
	const { actions } = useSession();
	const { attachNode } = useMouseTarget(`turn-image:${image.path}`, {
		onClick(): void {
			actions.chooseBase(image);
		},
	});

	return (
		<Box ref={attachNode} flexShrink={0} width={width}>
			<PreviewSlot preview={preview} />
		</Box>
	);
}
