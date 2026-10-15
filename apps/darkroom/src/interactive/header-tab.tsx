import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface HeaderTabProperties {
	isActive: boolean;
	/** The number key that shows it, if it has one. */
	keyLabel?: string | undefined;
	title: string;
}

/**
 * One tab in the header: raised and bright when it is showing, muted when
 * it isn't, with the number key that shows it.
 *
 * @param properties - Its name, key, and whether it is showing.
 * @param properties.isActive - Whether it is the tab on screen.
 * @param properties.keyLabel - The number key that shows it.
 * @param properties.title - Its name, like `history`.
 * @returns The tab, one line tall.
 */
export function HeaderTab({ isActive, keyLabel, title }: Readonly<HeaderTabProperties>): ReactNode {
	return (
		<Box backgroundColor={isActive ? theme.element : theme.background} paddingX={1}>
			<Text>
				{keyLabel === undefined ? null : (
					<Text color={isActive ? theme.accent : theme.border}>{`${keyLabel} `}</Text>
				)}
				<Text bold={isActive} color={isActive ? theme.text : theme.muted}>
					{title}
				</Text>
			</Text>
		</Box>
	);
}
