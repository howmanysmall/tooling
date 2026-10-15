import { useHistoryBrowser } from "./history-browser-context";
import { BrowserMode } from "./history-browser-state";
import { HistoryDeletePrompt } from "./history-delete-prompt";
import { HistoryFilterBar } from "./history-filter-bar";
import { HistoryStatusLine } from "./history-status-line";

import type { ReactNode } from "react";

/**
 * Picks the footer variant for the current mode.
 *
 * @returns The filter bar, the delete question, or the status line.
 */
export function HistoryFooterLine(): ReactNode {
	const {
		state: { mode },
	} = useHistoryBrowser();

	switch (mode) {
		case BrowserMode.ConfirmDelete:
			return <HistoryDeletePrompt />;
		case BrowserMode.Filter:
			return <HistoryFilterBar />;
		default:
			return <HistoryStatusLine />;
	}
}
