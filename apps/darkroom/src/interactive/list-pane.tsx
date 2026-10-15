import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface ListPaneProperties {
	/** Shown instead of the rows when there are none. */
	emptyText: string;
	/** Rows of content the pane holds, inside its padding. */
	height: number;
	isEmpty: boolean;
	width: number;
	children: ReactNode;
}

/**
 * A browser's left pane: a filled panel of rows, or a hint when it has none.
 *
 * @param properties - The rows and the pane's size.
 * @param properties.emptyText - Shown when there are no rows.
 * @param properties.height - Rows of content the pane holds.
 * @param properties.isEmpty - Whether there are no rows.
 * @param properties.width - The pane's width, padding included.
 * @param properties.children - The rows.
 * @returns A filled column of the rows, padded on every side.
 */
export function ListPane({ emptyText, height, isEmpty, width, children }: Readonly<ListPaneProperties>): ReactNode {
	return (
		<Box
			backgroundColor={theme.panel}
			flexDirection="column"
			flexShrink={0}
			height={height + 2}
			paddingX={1}
			paddingY={1}
			width={width}
		>
			{isEmpty ? <Text color={theme.muted}>{emptyText}</Text> : children}
		</Box>
	);
}
