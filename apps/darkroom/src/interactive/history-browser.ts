import { BrowserPanes } from "./browser-panes";
import { HistoryBrowserFooter } from "./history-browser-footer";
import { HistoryBrowserFrame } from "./history-browser-frame";
import { HistoryBrowserHeader } from "./history-browser-header";
import { HistoryBrowserProvider } from "./history-browser-provider";
import { HistoryRunDetail } from "./history-run-detail";
import { HistoryRunList } from "./history-run-list";

/**
 * The history browser's parts. Each reads the shared state from
 * `HistoryBrowser.Provider`, so a screen composes only the parts it needs.
 */
export const HistoryBrowser = {
	Footer: HistoryBrowserFooter,
	Frame: HistoryBrowserFrame,
	Header: HistoryBrowserHeader,
	Panes: BrowserPanes,
	Provider: HistoryBrowserProvider,
	RunDetail: HistoryRunDetail,
	RunList: HistoryRunList,
} as const;
