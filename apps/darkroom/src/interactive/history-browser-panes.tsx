import { Box } from "ink";

import type { ReactNode } from "react";

export interface HistoryBrowserPanesProperties {
	children: ReactNode;
}

/**
 * Lays the list and detail panes side by side, filling the space between the
 * header and the footer.
 *
 * @param properties - What to place side by side.
 * @param properties.children - The run list, then the run detail.
 * @returns A row that grows to fill the screen.
 */
export function HistoryBrowserPanes({ children }: Readonly<HistoryBrowserPanesProperties>): ReactNode {
	return (
		<Box columnGap={1} flexGrow={1}>
			{children}
		</Box>
	);
}
