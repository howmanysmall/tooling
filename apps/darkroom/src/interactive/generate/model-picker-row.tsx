import { Box, Text } from "ink";

import { HighlightedText } from "$interactive/components/highlighted-text";
import { getDialogRowBackground } from "$interactive/components/row-background";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

import type { ModelMatch } from "./model-picker-state";

export interface ModelPickerRowProperties {
	/** What it can do, like `edits · ×4 · transparent`. */
	abilities: string;
	/** Whether it is the model the prompt box uses now. */
	isCurrent: boolean;
	isSelected: boolean;
	match: ModelMatch;
	/** Picks the model, as a click does. */
	onChoose: () => void;
	/** What an image costs, like `$0.039/img`. */
	price: string;
}

function getMark(isCurrent: boolean, isRecent: boolean): string {
	if (isCurrent) return "●";
	return isRecent ? "◦" : " ";
}

/**
 * One model in the picker: a dot for the current model and a ring for
 * recent ones, its name with the matched characters highlighted, and its
 * abilities and price at the right. The chosen row is filled, the row
 * under the pointer is lit, and a click picks it.
 *
 * @param properties - The model and how it stands.
 * @param properties.abilities - What it can do, like `edits · ×4`.
 * @param properties.isCurrent - Whether the prompt box uses it now.
 * @param properties.isSelected - Whether Enter would pick it.
 * @param properties.match - The model and the characters the query hit.
 * @param properties.onChoose - Picks the model.
 * @param properties.price - What an image costs.
 * @returns One line.
 */
export function ModelPickerRow({
	abilities,
	isCurrent,
	isSelected,
	match,
	onChoose,
	price,
}: Readonly<ModelPickerRowProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget(`picker:${match.model.id}`, { onClick: onChoose });
	const muted = isSelected ? theme.background : theme.muted;

	return (
		<Box
			ref={attachNode}
			backgroundColor={getDialogRowBackground(isSelected, isHovered)}
			columnGap={2}
			paddingX={1}
		>
			<Box flexShrink={0} width={2}>
				<Text color={isSelected ? theme.background : theme.accent}>{getMark(isCurrent, match.isRecent)}</Text>
			</Box>
			<Box flexGrow={1} flexShrink={1} overflow="hidden">
				<HighlightedText isSelected={isSelected} positions={match.positions} text={match.model.name} />
			</Box>
			<Box flexShrink={0}>
				<Text color={muted}>{abilities}</Text>
			</Box>
			<Box flexShrink={0} justifyContent="flex-end" width={14}>
				<Text color={muted}>{price}</Text>
			</Box>
		</Box>
	);
}
