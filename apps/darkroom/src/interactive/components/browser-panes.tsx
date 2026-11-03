import { Box } from "ink";

import type { PropsWithChildren, ReactNode } from "react";

/**
 * Lays a browser's list and detail panes side by side, filling the space
 * between the header and the footer.
 *
 * @param properties - What to place side by side.
 * @param properties.children - The list, then the detail pane.
 * @returns A row that grows to fill the screen.
 */
export function BrowserPanes({ children }: Readonly<PropsWithChildren>): ReactNode {
	return (
		<Box columnGap={1} flexGrow={1}>
			{children}
		</Box>
	);
}
