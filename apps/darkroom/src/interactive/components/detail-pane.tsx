import { Box, Text } from "ink";

import { theme } from "./theme";

import type { ReactNode } from "react";

export interface DetailPaneProperties {
	/** Whether something is selected to describe. */
	isEmpty: boolean;
	children: ReactNode;
}

/**
 * A browser's right pane: a filled panel describing the selection, or a
 * hint when nothing is selected.
 *
 * @param properties - The details.
 * @param properties.isEmpty - Whether nothing is selected.
 * @param properties.children - The details, top to bottom.
 * @returns The pane, filling the space beside the list.
 */
export function DetailPane({ isEmpty, children }: Readonly<DetailPaneProperties>): ReactNode {
	if (isEmpty) {
		return (
			<Box alignItems="center" backgroundColor={theme.panel} flexGrow={1} justifyContent="center">
				<Text color={theme.muted}>{"Nothing selected"}</Text>
			</Box>
		);
	}

	return (
		<Box
			backgroundColor={theme.panel}
			flexDirection="column"
			flexGrow={1}
			overflow="hidden"
			paddingX={3}
			paddingY={1}
			rowGap={1}
		>
			{children}
		</Box>
	);
}
