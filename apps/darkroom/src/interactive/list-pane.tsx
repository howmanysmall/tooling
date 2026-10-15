import { Box, Text } from "ink";

import { useMouseTarget } from "./mouse-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ListPaneProperties {
	/** Shown instead of the rows when there are none. */
	emptyText: string;
	/** Rows of content the pane holds, inside its padding. */
	height: number;
	isEmpty: boolean;
	/** Moves the cursor: `1` for the wheel down, `-1` for up. */
	onWheel: (delta: number) => void;
	/** Names it to the mouse; unique on screen, like `pane:history`. */
	target: string;
	width: number;
	children: ReactNode;
}

/**
 * A browser's left pane: a filled panel of rows, or a hint when it has
 * none. The wheel over it moves the cursor.
 *
 * @param properties - The rows and the pane's size.
 * @param properties.emptyText - Shown when there are no rows.
 * @param properties.height - Rows of content the pane holds.
 * @param properties.isEmpty - Whether there are no rows.
 * @param properties.onWheel - Moves the cursor.
 * @param properties.target - Names it to the mouse; unique on screen.
 * @param properties.width - The pane's width, padding included.
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
}: Readonly<ListPaneProperties>): ReactNode {
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
