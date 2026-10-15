import { Text } from "ink";

import { splitTitle } from "./command-palette-state";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface HighlightedTextProperties {
	/** Whether its row is selected, which fills it with the accent. */
	isSelected: boolean;
	/** Which characters a search matched. */
	positions: ReadonlySet<number>;
	text: string;
}

/**
 * A list row's title with the characters a search matched underlined, in
 * the accent unless the row is selected and already filled with it.
 *
 * @param properties - The title and what matched.
 * @param properties.isSelected - Whether the row is selected.
 * @param properties.positions - The indexes of the matched characters.
 * @param properties.text - The title.
 * @returns The title.
 */
export function HighlightedText({ isSelected, positions, text }: Readonly<HighlightedTextProperties>): ReactNode {
	const plain = isSelected ? theme.background : theme.text;

	return (
		<Text bold={isSelected} color={plain} wrap="truncate-end">
			{splitTitle(text, positions).map(({ isMatch, start, text: segment }) => (
				<Text key={start} color={isMatch && !isSelected ? theme.accent : plain} underline={isMatch}>
					{segment}
				</Text>
			))}
		</Text>
	);
}
