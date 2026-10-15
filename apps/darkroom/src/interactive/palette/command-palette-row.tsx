import { Box, Text } from "ink";

import { HighlightedText } from "$interactive/components/highlighted-text";
import { getDialogRowBackground } from "$interactive/components/row-background";
import { theme } from "$interactive/components/theme";
import { useMouseTarget } from "$interactive/mouse/mouse-context";

import type { ReactNode } from "react";

import type { PaletteMatch } from "./command-palette-state";

export interface PaletteRowProperties {
	isSelected: boolean;
	match: PaletteMatch;
	/** Runs the command, as a click does. */
	onChoose: () => void;
}

/**
 * One command in the palette: its title, with the matched characters in the
 * accent color, what it does when it says, and its key at the right. The
 * chosen row is filled; the pointer chooses the row it is over, and a click
 * runs it.
 *
 * @param properties - The command and whether it is chosen.
 * @param properties.isSelected - Whether Enter would run it.
 * @param properties.match - The command and the characters the query hit.
 * @param properties.onChoose - Runs the command.
 * @returns One line.
 */
export function PaletteRow({ isSelected, match, onChoose }: Readonly<PaletteRowProperties>): ReactNode {
	const { command, positions } = match;
	const { attachNode, isHovered } = useMouseTarget(`palette:${command.key}`, { onClick: onChoose });

	return (
		<Box
			ref={attachNode}
			backgroundColor={getDialogRowBackground(isSelected, isHovered)}
			justifyContent="space-between"
			paddingX={1}
		>
			<Text wrap="truncate-end">
				<HighlightedText isSelected={isSelected} positions={positions} text={command.title} />
				{command.description === undefined ? null : (
					<Text color={isSelected ? theme.background : theme.muted}>{`  ${command.description}`}</Text>
				)}
			</Text>
			<Text color={isSelected ? theme.background : theme.muted}>{command.keyLabel}</Text>
		</Box>
	);
}
