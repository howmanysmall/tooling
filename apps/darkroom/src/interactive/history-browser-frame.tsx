import { Box } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { useHistoryBrowserKeys } from "./use-history-browser-keys";

import type { ReactNode } from "react";

export interface HistoryBrowserFrameProperties {
	children: ReactNode;
}

/**
 * The full-screen column that holds the browser's parts, and owns the key
 * bindings.
 *
 * @param properties - The parts to lay out.
 * @param properties.children - The header, panes, and footer.
 * @returns A box the size of the terminal.
 */
export function HistoryBrowserFrame({ children }: Readonly<HistoryBrowserFrameProperties>): ReactNode {
	const {
		meta: { layout },
	} = useHistoryBrowser();
	useHistoryBrowserKeys();

	return (
		<Box flexDirection="column" height={layout.rows} width={layout.columns}>
			{children}
		</Box>
	);
}
