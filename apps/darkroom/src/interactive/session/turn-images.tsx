import { Box } from "ink";

import { PreviewSlot } from "$interactive/components/preview-slot";

import type { ReactNode } from "react";

import type { SavedImage } from "$generation/save-run";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

export interface TurnImagesProperties {
	/** The cells each image may use. */
	box: CellBox;
	/** Loads a preview of a saved image, or `undefined` when previews are off. */
	getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	images: ReadonlyArray<SavedImage>;
}

/**
 * A finished turn's images, side by side, each drawn as soon as it loads.
 *
 * @param properties - The images and the space for each.
 * @param properties.box - The cells each image may use.
 * @param properties.getPreview - Loads a preview.
 * @param properties.images - Where the images were saved.
 * @returns A row of previews, or nothing when previews are off.
 */
export function TurnImages({ box, getPreview, images }: Readonly<TurnImagesProperties>): ReactNode {
	const previews = images.flatMap(({ path }) => {
		const preview = path === undefined ? undefined : getPreview(path, box);
		return preview === undefined || path === undefined ? [] : [{ path, preview }];
	});
	if (previews.length === 0) return null;

	return (
		<Box columnGap={2} flexShrink={0}>
			{previews.map(({ path, preview }) => (
				<Box key={path} flexShrink={0} width={box.columns}>
					<PreviewSlot preview={preview} />
				</Box>
			))}
		</Box>
	);
}
