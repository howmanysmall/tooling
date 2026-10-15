import { Box, Text } from "ink";

import { useMouseTarget } from "./mouse-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface HeaderTabProperties {
	isActive: boolean;
	/** The number key that shows it, if it has one. */
	keyLabel?: string | undefined;
	/** Shows the tab, as a click does. */
	onSelect?: (() => void) | undefined;
	title: string;
}

function getBackground(isActive: boolean, isHovered: boolean): string {
	if (isActive) return theme.element;
	return isHovered ? theme.hover : theme.background;
}

/**
 * One tab in the header: raised and bright when it is showing, muted when
 * it isn't, with the number key that shows it. Clicking it shows it.
 *
 * @param properties - Its name, key, and whether it is showing.
 * @param properties.isActive - Whether it is the tab on screen.
 * @param properties.keyLabel - The number key that shows it.
 * @param properties.onSelect - Shows the tab.
 * @param properties.title - Its name, like `history`.
 * @returns The tab, one line tall.
 */
export function HeaderTab({ isActive, keyLabel, onSelect, title }: Readonly<HeaderTabProperties>): ReactNode {
	const { attachNode, isHovered } = useMouseTarget(`tab:${title}`, { onClick: onSelect });
	const isBright = isActive || isHovered;

	return (
		<Box ref={attachNode} backgroundColor={getBackground(isActive, isHovered)} paddingX={1}>
			<Text>
				{keyLabel === undefined ? null : (
					<Text color={isActive ? theme.accent : theme.border}>{`${keyLabel} `}</Text>
				)}
				<Text bold={isActive} color={isBright ? theme.text : theme.muted}>
					{title}
				</Text>
			</Text>
		</Box>
	);
}
