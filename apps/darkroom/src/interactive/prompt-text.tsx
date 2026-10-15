import { Text } from "ink";

import { splitAtCursor } from "./prompt-editor-state";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { PromptEditor } from "./prompt-editor-state";

export interface PromptTextProperties {
	editor: PromptEditor;
	/** Shown, muted, while the prompt is empty. */
	placeholder: string;
}

/**
 * The prompt as typed, wrapped to the box, with the cursor drawn as an
 * inverted character. An empty prompt shows the placeholder instead.
 *
 * @param properties - The prompt and the placeholder.
 * @param properties.editor - The text and cursor.
 * @param properties.placeholder - What to show while it is empty.
 * @returns The prompt's lines.
 */
export function PromptText({ editor, placeholder }: Readonly<PromptTextProperties>): ReactNode {
	if (editor.text === "") {
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
			{before}
			<Text inverse={true}>{at}</Text>
			{after}
		</Text>
	);
}
