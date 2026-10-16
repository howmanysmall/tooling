import { Box, Text } from "ink";

import { placeRuns, sliceRuns } from "./marquee";
import { useMarquee } from "./use-marquee";

import type { ReactNode } from "react";

import type { StyledRun } from "./marquee";

export interface MarqueeTextProperties {
	/** Whether it scrolls when cut off, as for the chosen row. */
	isScrolling: boolean;
	/** The line, in styled stretches. */
	runs: ReadonlyArray<StyledRun>;
}

/**
 * A line that takes the room left in its row. Cut off, it ends in `…`,
 * and while scrolling it rests, loops through so all of it can be read,
 * and rests again.
 *
 * @param properties - The line and whether it scrolls.
 * @param properties.isScrolling - Whether it scrolls when cut off.
 * @param properties.runs - The line, in styled stretches.
 * @returns The line in a growing box.
 */
export function MarqueeText({ isScrolling, runs }: Readonly<MarqueeTextProperties>): ReactNode {
	const { boxRef, scrolled } = useMarquee(runs.map((run) => run.text).join(""), isScrolling);
	const shown = scrolled === undefined ? placeRuns(runs) : sliceRuns(runs, scrolled);

	return (
		<Box ref={boxRef} flexGrow={1} flexShrink={1} overflow="hidden">
			<Text wrap="truncate-end">
				{shown.map(({ color, isBold, isUnderlined, start, text }) => (
					<Text key={start} bold={isBold === true} color={color} underline={isUnderlined === true}>
						{text}
					</Text>
				))}
			</Text>
		</Box>
	);
}
