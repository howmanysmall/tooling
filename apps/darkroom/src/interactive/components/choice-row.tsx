import { Box, Text } from "ink";

import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { getDialogRowBackground } from "./row-background";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ChoiceRowProperties {
	isSelected: boolean;
	label: string;
	/** Picks it, as a click does. */
	onChoose: () => void;
	/** Its place in the list, from 1, which its number key picks. */
	position: number;
}

/**
 * One answer in a choice dialog: its number and label. The chosen row is
 * filled, the row under the pointer is lit, and a click picks it.
 *
 * @param properties - The answer and how it stands.
 * @param properties.isSelected - Whether Enter would pick it.
 * @param properties.label - What it says.
 * @param properties.onChoose - Picks it.
 * @param properties.position - Its number.
 * @returns One line.
 */
export function ChoiceRow({ isSelected, label, onChoose, position }: Readonly<ChoiceRowProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget(`choice:${position}`, { onClick: onChoose });

	return (
		<Box ref={attachNode} backgroundColor={getDialogRowBackground(isSelected, isHovered)} paddingX={1}>
			<Text bold={isSelected} color={isSelected ? theme.background : theme.text}>
				{`${position}. ${label}`}
			</Text>
		</Box>
	);
}
