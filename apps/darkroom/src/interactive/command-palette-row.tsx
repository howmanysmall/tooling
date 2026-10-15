import { Box, Text } from "ink";

import { splitTitle } from "./command-palette-state";
import { theme } from "./theme";

import type { ReactNode } from "react";

import type { PaletteMatch } from "./command-palette-state";

export interface PaletteRowProperties {
	isSelected: boolean;
	match: PaletteMatch;
}

/**
 * One command in the palette: its title, with the matched characters in the
 * accent color, and its key at the right. The chosen row is filled.
 *
 * @param properties - The command and whether it is chosen.
 * @param properties.isSelected - Whether Enter would run it.
 * @param properties.match - The command and the characters the query hit.
 * @returns One line.
 */
export function PaletteRow({ isSelected, match }: Readonly<PaletteRowProperties>): ReactNode {
	const { command, positions } = match;
	const background = isSelected ? theme.accent : theme.element;
	const plain = isSelected ? theme.background : theme.text;

	return (
		<Box backgroundColor={background} justifyContent="space-between" paddingX={1}>
			<Text bold={isSelected} color={plain}>
				{splitTitle(command.title, positions).map(({ isMatch, start, text }) => (
					<Text key={start} color={isMatch && !isSelected ? theme.accent : plain} underline={isMatch}>
						{text}
					</Text>
				))}
			</Text>
			<Text color={isSelected ? theme.background : theme.muted}>{command.keyLabel}</Text>
		</Box>
	);
}
