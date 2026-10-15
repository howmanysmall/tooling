import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ScreenHeaderProperties {
	/** A short count or total for the right edge. */
	summary: string;
	/** What the screen shows, like `history`. */
	title: string;
}

/**
 * A full-screen browser's top line: the brand and the screen's name on the
 * left, a summary on the right.
 *
 * @param properties - The screen's name and summary.
 * @param properties.title - What the screen shows, like `history`.
 * @param properties.summary - Like `4 runs · $0.039`.
 * @returns One line.
 */
export function ScreenHeader({ summary, title }: Readonly<ScreenHeaderProperties>): ReactNode {
	return (
		<Box justifyContent="space-between" paddingX={1}>
			<Text>
				<Text bold={true} color={theme.accent}>
					{"◐ darkroom"}
				</Text>
				<Text color={theme.muted}>{`  ${title}`}</Text>
			</Text>
			<Text color={theme.muted}>{summary}</Text>
		</Box>
	);
}
