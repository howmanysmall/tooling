import { Box, Text } from "ink";

import { HighlightedText } from "$interactive/components/highlighted-text";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

import type { PaletteMatch } from "./command-palette-state";

export interface PaletteRowProperties {
	isSelected: boolean;
	match: PaletteMatch;
	/** Runs the command, as a click does. */
	onChoose: () => void;
	/** Puts the cursor on the row, as the pointer moving onto it does. */
	onPoint: () => void;
}

/**
 * One command in the palette: its title, with the matched characters in the
 * accent color, and its key at the right. The chosen row is filled; the
 * pointer chooses the row it is over, and a click runs it.
 *
 * @param properties - The command and whether it is chosen.
 * @param properties.isSelected - Whether Enter would run it.
 * @param properties.match - The command and the characters the query hit.
 * @param properties.onChoose - Runs the command.
 * @param properties.onPoint - Puts the cursor on the row.
 * @returns One line.
 */
export function PaletteRow({ isSelected, match, onChoose, onPoint }: Readonly<PaletteRowProperties>): ReactNode {
	const { command, positions } = match;
	const { attachNode } = useMouseTarget(`palette:${command.key}`, { onClick: onChoose, onHover: onPoint });

	return (
		<Box
			ref={attachNode}
			backgroundColor={isSelected ? theme.accent : theme.element}
			justifyContent="space-between"
			paddingX={1}
		>
			<HighlightedText isSelected={isSelected} positions={positions} text={command.title} />
			<Text color={isSelected ? theme.background : theme.muted}>{command.keyLabel}</Text>
		</Box>
	);
}
