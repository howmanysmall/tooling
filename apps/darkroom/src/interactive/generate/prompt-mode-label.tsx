import { Text } from "ink";

import { theme } from "$interactive/components/theme";

import type { ReactNode } from "react";

// Between the label and the model that follows it.
const SEPARATOR = " · ";

export interface PromptModeLabelProperties {
	/** Whether the model takes images; if not, the prompt starts fresh. */
	canEdit: boolean;
	/** The file name of the image to edit, or `undefined` to start fresh. */
	editFileName?: string | undefined;
}

/**
 * What the next prompt does, before the model on the prompt box's last
 * line, the way opencode names its agent there: `Edit ◧ cat_2.webp` when it
 * changes an image above, `New` when it starts fresh, and a warning when
 * the model can't take the image.
 *
 * @param properties - The image being edited, if any.
 * @param properties.canEdit - Whether the model takes images.
 * @param properties.editFileName - The image's file name, if any.
 * @returns The start of the line, ending in a separator before the model.
 */
export function PromptModeLabel({ canEdit, editFileName }: Readonly<PromptModeLabelProperties>): ReactNode {
	if (editFileName === undefined) {
		return (
			<Text>
				<Text bold={true} color={theme.muted}>
					{"New"}
				</Text>
				<Text color={theme.muted}>{SEPARATOR}</Text>
			</Text>
		);
	}

	const color = canEdit ? theme.accent : theme.warning;
	return (
		<Text wrap="truncate-middle">
			<Text bold={true} color={color}>
				{"Edit"}
			</Text>
			<Text color={canEdit ? theme.text : theme.warning}>{` ◧ ${editFileName}`}</Text>
			{canEdit ? null : <Text color={theme.warning}>{" · this model can't edit"}</Text>}
			<Text color={theme.muted}>{SEPARATOR}</Text>
		</Text>
	);
}
