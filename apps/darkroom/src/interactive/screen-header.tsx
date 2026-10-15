import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ScreenHeaderProperties {
	/** What the screen shows, like `history`. */
	title: string;
}

/**
 * A full-screen browser's top line: the brand, then the screen's name on a
 * raised tab.
 *
 * @param properties - The screen's name.
 * @param properties.title - What the screen shows, like `history`.
 * @returns One line.
 */
export function ScreenHeader({ title }: Readonly<ScreenHeaderProperties>): ReactNode {
	return (
		<Box columnGap={2} flexShrink={0} paddingX={2}>
			<Text bold={true} color={theme.accent}>
				{"◐ darkroom"}
			</Text>
			<Box backgroundColor={theme.element} paddingX={1}>
				<Text bold={true}>{title}</Text>
			</Box>
		</Box>
	);
}
