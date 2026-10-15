import { Box } from "ink";

import { HistoryFooterLine } from "./history-footer-line";

import type { ReactNode } from "react";

/**
 * The bottom line, inset to line up with the panes' contents.
 *
 * @returns The footer for the current mode.
 */
export function HistoryBrowserFooter(): ReactNode {
	return (
		<Box paddingX={1}>
			<HistoryFooterLine />
		</Box>
	);
}
