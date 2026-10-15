import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";

import { GenerateModelLine } from "./generate-model-line";
import { PromptModeLabel } from "./prompt-mode-label";
import { PromptText } from "./prompt-text";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { ModelPrices } from "$generation/observed-prices";

import type { PromptEditor } from "./prompt-editor-state";

export interface PromptBoxProperties {
	/** Whether the model takes images, to edit one. */
	canEdit: boolean;
	/** The file name of the image the prompt edits, or `undefined`. */
	editFileName?: string | undefined;
	editor: PromptEditor;
	model?: ImageModelListItem | undefined;
	prices?: ModelPrices | undefined;
	width: number;
}

const PLACEHOLDER = "Describe an image…";

/**
 * The prompt box: a raised panel with the safelight on its left edge, the
 * prompt as typed, and beneath it whether it edits an image or starts
 * fresh, and the model it generates with.
 *
 * @param properties - The prompt, the model, and the width.
 * @param properties.canEdit - Whether the model takes images.
 * @param properties.editFileName - The image the prompt edits, if any.
 * @param properties.editor - The text and cursor.
 * @param properties.model - The model to generate with, if any.
 * @param properties.prices - That model's prices.
 * @param properties.width - How wide the box is.
 * @returns A panel with the prompt above the model line.
 */
export function PromptBox({
	canEdit,
	editFileName,
	editor,
	model,
	prices,
	width,
}: Readonly<PromptBoxProperties>): ReactNode {
	return (
		<Box
			backgroundColor={theme.panel}
			borderBottom={false}
			borderColor={theme.accent}
			borderRight={false}
			borderStyle="bold"
			borderTop={false}
			flexDirection="column"
			flexShrink={0}
			paddingX={2}
			paddingY={1}
			rowGap={1}
			width={width}
		>
			<PromptText editor={editor} placeholder={PLACEHOLDER} />
			<Box>
				<Box flexShrink={0}>
					<PromptModeLabel canEdit={canEdit} editFileName={editFileName} />
				</Box>
				{model === undefined || prices === undefined ? (
					<Text color={theme.muted}>{"No models"}</Text>
				) : (
					<GenerateModelLine model={model} prices={prices} />
				)}
			</Box>
		</Box>
	);
}
