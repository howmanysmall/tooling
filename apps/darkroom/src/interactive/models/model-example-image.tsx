import { Box, Text } from "ink";

import { PreviewSlot } from "$interactive/components/preview-slot";
import { theme } from "$interactive/components/theme";

import { useModelBrowser } from "./model-browser-context";
import { describeExampleCaption } from "./model-facts";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

export interface ModelExampleImageProperties {
	model: ImageModelListItem;
}

/**
 * An image of what the model does: the newest one you made with it, or the
 * example shipped with darkroom, captioned with its prompt.
 *
 * @param properties - Whose example to show.
 * @param properties.model - The selected model.
 * @returns The image and caption, or nothing when there is no example or
 *   previews are off.
 */
export function ModelExampleImage({ model }: Readonly<ModelExampleImageProperties>): ReactNode {
	const { meta } = useModelBrowser();
	const example = meta.getExample(model);
	const preview = example === undefined ? undefined : meta.getPreview(example);
	if (example === undefined || preview === undefined) return null;

	return (
		<Box alignItems="center" flexDirection="column" flexShrink={0}>
			<PreviewSlot preview={preview} />
			<Text color={theme.muted} wrap="truncate-end">
				{describeExampleCaption(example, meta.now, meta.canSwitchExample(model))}
			</Text>
		</Box>
	);
}
