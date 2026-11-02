import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import { splitAtCursor } from "./prompt-editor-state";
import { formatImageToken } from "./prompt-images";

import type { ReactNode } from "react";

import type { PromptEditor } from "./prompt-editor-state";
import type { PromptImage } from "./prompt-images";

export interface PromptTextProperties {
	editor: PromptEditor;
	/** The images pasted into the prompt. */
	images?: ReadonlyArray<PromptImage> | undefined;
	/** Shown, muted, while the prompt is empty. */
	placeholder: string;
}

const IMAGE_TOKEN = /(\[Image \d+\])/u;
const NO_IMAGES: ReadonlyArray<PromptImage> = [];

/**
 * The prompt as typed, wrapped to the box, with the cursor drawn as an
 * inverted character. An empty prompt shows the placeholder instead.
 *
 * @param properties - The prompt and the placeholder.
 * @param properties.editor - The text and cursor.
 * @param properties.images - The images pasted in, whose tokens stand out.
 * @param properties.placeholder - What to show while it is empty.
 * @returns The prompt's lines.
 */
export function PromptText({ editor, images = NO_IMAGES, placeholder }: Readonly<PromptTextProperties>): ReactNode {
	if (editor.text.length === 0) {
		return (
			<Text>
				<Text inverse={true}>{placeholder.charAt(0)}</Text>
				<Text color={theme.muted}>{placeholder.slice(1)}</Text>
			</Text>
		);
	}

	const { after, at, before } = splitAtCursor(editor);
	return (
		<Text color={theme.text}>
			{renderImageTokens(before, images)}
			<Text inverse={true}>{at}</Text>
			{renderImageTokens(after, images)}
		</Text>
	);
}

function renderImageTokens(text: string, images: ReadonlyArray<PromptImage>): ReactNode {
	if (images.length === 0) return text;

	return text.split(IMAGE_TOKEN).map((part, index) =>
		images.some(({ number }) => formatImageToken(number) === part) ? (
			// oxlint-disable-next-line react/no-array-index-key -- the parts have no identity but their place
			<Text backgroundColor={theme.accent} color={theme.background} key={index}>
				{part}
			</Text>
		) : (
			part
		),
	);
}
