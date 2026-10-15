import { Box, Text } from "ink";

import { HighlightedText } from "./highlighted-text";
import { useMouseTarget } from "./mouse-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { ModelMatch } from "./model-picker-state";

export interface ModelPickerRowProperties {
	/** Whether it is the model the prompt box uses now. */
	isCurrent: boolean;
	isSelected: boolean;
	match: ModelMatch;
	/** Picks the model, as a click does. */
	onChoose: () => void;
	/** Puts the cursor on the row, as the pointer moving onto it does. */
	onPoint: () => void;
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
 * price at the right. The chosen row is filled; the pointer chooses the
 * row it is over, and a click picks it.
 *
 * @param properties - The model and how it stands.
 * @param properties.isCurrent - Whether the prompt box uses it now.
 * @param properties.isSelected - Whether Enter would pick it.
 * @param properties.match - The model and the characters the query hit.
 * @param properties.onChoose - Picks the model.
 * @param properties.onPoint - Puts the cursor on the row.
 * @param properties.price - What an image costs.
 * @returns One line.
 */
export function ModelPickerRow({
	isCurrent,
	isSelected,
	match,
	onChoose,
	onPoint,
	price,
}: Readonly<ModelPickerRowProperties>): ReactNode {
	const { attachNode } = useMouseTarget(`picker:${match.model.id}`, { onClick: onChoose, onHover: onPoint });
	const muted = isSelected ? theme.background : theme.muted;

	return (
		<Box ref={attachNode} backgroundColor={isSelected ? theme.accent : theme.element} columnGap={2} paddingX={1}>
			<Box flexShrink={0} width={2}>
				<Text color={isSelected ? theme.background : theme.accent}>{getMark(isCurrent, match.isRecent)}</Text>
			</Box>
			<Box flexGrow={1} flexShrink={1} overflow="hidden">
				<HighlightedText isSelected={isSelected} positions={match.positions} text={match.model.name} />
			</Box>
			<Box flexShrink={0}>
				<Text color={muted}>{price}</Text>
			</Box>
		</Box>
	);
}
