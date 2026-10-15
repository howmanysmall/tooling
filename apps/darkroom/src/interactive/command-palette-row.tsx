import { Box, Text } from "ink";

import { HighlightedText } from "./highlighted-text";
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

	return (
		<Box backgroundColor={isSelected ? theme.accent : theme.element} justifyContent="space-between" paddingX={1}>
			<HighlightedText isSelected={isSelected} positions={positions} text={command.title} />
			<Text color={isSelected ? theme.background : theme.muted}>{command.keyLabel}</Text>
		</Box>
	);
}
