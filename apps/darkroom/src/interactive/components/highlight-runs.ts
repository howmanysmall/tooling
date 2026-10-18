import { splitTitle } from "$interactive/palette/command-palette-state";

import { theme } from "./theme";

import type { StyledRun } from "./marquee";

/**
 * Styles a list row's title with the characters a search matched
 * underlined, in the accent unless the row is selected and already filled
 * with it.
 *
 * @param text - The title.
 * @param positions - The indexes of the matched characters.
 * @param isSelected - Whether the row is selected, which makes it bold.
 * @returns The title, in styled stretches for `MarqueeText`.
 */
export function getHighlightRuns(text: string, positions: ReadonlySet<number>, isSelected: boolean): Array<StyledRun> {
	const plain = isSelected ? theme.background : theme.text;
	return splitTitle(text, positions).map(({ isMatch, text: segment }) => ({
		color: isMatch && !isSelected ? theme.accent : plain,
		isBold: isSelected,
		isUnderlined: isMatch,
		text: segment,
	}));
}
