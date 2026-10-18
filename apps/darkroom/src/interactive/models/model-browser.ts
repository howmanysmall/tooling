import { BrowserPanes } from "$interactive/components/browser-panes";

import { ModelBrowserFooter } from "./model-browser-footer";
import { ModelBrowserFrame } from "./model-browser-frame";
import { ModelBrowserHeader } from "./model-browser-header";
import { ModelBrowserProvider } from "./model-browser-provider";
import { ModelDetail } from "./model-detail";
import { ModelList } from "./model-list";

/**
 * The model browser's parts. Each reads the shared state from
 * `ModelBrowser.Provider`, so a screen composes only the parts it needs.
 */
export const ModelBrowser = {
	Detail: ModelDetail,
	Footer: ModelBrowserFooter,
	Frame: ModelBrowserFrame,
	Header: ModelBrowserHeader,
	List: ModelList,
	Panes: BrowserPanes,
	Provider: ModelBrowserProvider,
} as const;
