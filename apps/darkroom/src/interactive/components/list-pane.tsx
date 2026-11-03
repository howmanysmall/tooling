import { Box, Text } from "ink";

import { useMouseTarget } from "$interactive/mouse/mouse-context";

import { theme } from "./theme";

import type { PropsWithChildren, ReactNode } from "react";

export interface ListPaneProperties {
	/** Shown instead of the rows when there are none. */
	emptyText: string;
	/** Rows of content the pane holds, inside its padding. */
	height: number;
	/** Whether there are no rows. */
	isEmpty: boolean;
	/** Moves the cursor: `1` for the wheel down, `-1` for up. */
	onWheel: (delta: number) => void;
	/** Names it to the mouse; unique on screen, like `pane:history`. */
	target: string;
	/** The pane's width, padding included. */
	width: number;
}

/**
 * A browser's left pane: a filled panel of rows, or a hint when it has
 * none. The wheel over it moves the cursor.
 *
 * @param properties - The rows and the pane's size.
 * @param properties.children - The rows.
 * @returns A filled column of the rows, padded on every side.
 */
export function ListPane({
	emptyText,
	height,
	isEmpty,
	onWheel,
	target,
	width,
	children,
}: Readonly<PropsWithChildren<ListPaneProperties>>): ReactNode {
	const { attachNode } = useMouseTarget(target, { onWheel });
	const content = isEmpty ? <Text color={theme.muted}>{emptyText}</Text> : children;

	return (
		<Box
			ref={attachNode}
			backgroundColor={theme.panel}
			flexDirection="column"
			flexShrink={0}
			height={height + 2}
			paddingX={1}
			paddingY={1}
			width={width}
		>
			{content}
		</Box>
	);
}
