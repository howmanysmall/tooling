import { useInput } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { BrowserKey, getBrowserKey } from "./history-browser-keys";
import { BrowserMode } from "./history-browser-state";

import type { HistoryBrowserActions } from "./history-browser-context";

// The actions a key can trigger: those that take no arguments.
type KeyActionName = Exclude<keyof HistoryBrowserActions, "answerDelete" | "setFilter">;

const KEY_ACTIONS: ReadonlyMap<BrowserKey, KeyActionName> = new Map<BrowserKey, KeyActionName>([
	[BrowserKey.Copy, "copySelected"],
	[BrowserKey.Delete, "askDelete"],
	[BrowserKey.Down, "moveDown"],
	[BrowserKey.Filter, "openFilter"],
	[BrowserKey.First, "moveToFirst"],
	[BrowserKey.Last, "moveToLast"],
	[BrowserKey.Open, "openSelected"],
	[BrowserKey.PageDown, "movePageDown"],
	[BrowserKey.PageUp, "movePageUp"],
	[BrowserKey.Quit, "quit"],
	[BrowserKey.Rerun, "rerunSelected"],
	[BrowserKey.Up, "moveUp"],
]);

/**
 * Binds the keyboard to the browser's actions. The filter input handles its
 * own typing, and Esc there cancels the filter. While the delete question is
 * up, the next key answers it.
 */
export function useHistoryBrowserKeys(): void {
	const { actions, state } = useHistoryBrowser();

	useInput((input, key) => {
		if (state.mode === BrowserMode.Filter) {
			if (key.escape) actions.cancelFilter();
			return;
		}

		if (state.mode === BrowserMode.ConfirmDelete) {
			actions.answerDelete(input);
			return;
		}

		const binding = getBrowserKey(input, key);
		const name = binding === undefined ? undefined : KEY_ACTIONS.get(binding);
		if (name !== undefined) actions[name]();
	});
}
