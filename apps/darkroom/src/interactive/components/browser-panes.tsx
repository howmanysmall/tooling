import { Box } from "ink";

import type { ReactNode } from "react";

export interface BrowserPanesProperties {
	children: ReactNode;
}

/**
 * Lays a browser's list and detail panes side by side, filling the space
 * between the header and the footer.
 *
 * @param properties - What to place side by side.
 * @param properties.children - The list, then the detail pane.
 * @returns A row that grows to fill the screen.
 */
export function BrowserPanes({ children }: Readonly<BrowserPanesProperties>): ReactNode {
	return (
		<Box columnGap={1} flexGrow={1}>
			{children}
		</Box>
	);
}
