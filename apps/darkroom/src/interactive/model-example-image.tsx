import { Box, Text } from "ink";

import { previewPrompt } from "$history/format-history";

import { useModelBrowser } from "./model-browser-context";
import { PreviewSlot } from "./preview-slot";
import { describeMadeAt } from "./run-facts";
import { theme } from "./theme";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

export interface ModelExampleImageProperties {
	model: ImageModelListItem;
}

// Keeps the caption to about one line.
const CAPTION_PROMPT_LENGTH = 48;

/**
 * The newest image you made with a model, captioned with its prompt and
 * when you made it, so you can see what the model does.
 *
 * @param properties - Whose example to show.
 * @param properties.model - The selected model.
 * @returns The image and caption, or nothing when you haven't used the model
 *   or previews are off.
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
				{`your latest · “${previewPrompt(example.prompt, CAPTION_PROMPT_LENGTH)}” · ${describeMadeAt(example.created, meta.now)}`}
			</Text>
		</Box>
	);
}
