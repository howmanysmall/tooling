import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import { splitAtCursor } from "./prompt-editor-state";
import { TokenizedText } from "./tokenized-text";

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
			<TokenizedText images={images} text={before} />
			<Text inverse={true}>{at}</Text>
			<TokenizedText images={images} text={after} />
		</Text>
	);
}
