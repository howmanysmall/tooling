import { useInput } from "ink";

import { BrowserKey, getBrowserKey } from "./browser-keys";
import { useModelBrowser } from "./model-browser-context";

import type { ModelBrowserActions } from "./model-browser-context";

// The actions a key can trigger: those that take no arguments.
type KeyActionName = Exclude<keyof ModelBrowserActions, "setFilter">;

const KEY_ACTIONS: ReadonlyMap<BrowserKey, KeyActionName> = new Map<BrowserKey, KeyActionName>([
	[BrowserKey.Copy, "copySelected"],
	[BrowserKey.Down, "moveDown"],
	[BrowserKey.Example, "switchExample"],
	[BrowserKey.Filter, "openFilter"],
	[BrowserKey.First, "moveToFirst"],
	[BrowserKey.Last, "moveToLast"],
	[BrowserKey.Open, "chooseSelected"],
	[BrowserKey.PageDown, "movePageDown"],
	[BrowserKey.PageUp, "movePageUp"],
	[BrowserKey.Quit, "quit"],
	[BrowserKey.Sort, "cycleSort"],
	[BrowserKey.Up, "moveUp"],
]);

/**
 * Binds the keyboard to the model browser's actions. The filter input
 * handles its own typing, and Esc there cancels the filter.
 */
export function useModelBrowserKeys(): void {
	const { actions, state } = useModelBrowser();

	useInput(function onInput(input, key) {
		if (state.isFiltering) {
			if (key.escape) actions.cancelFilter();
			return;
		}

		const binding = getBrowserKey(input, key);
		const name = binding === undefined ? undefined : KEY_ACTIONS.get(binding);
		if (name !== undefined) actions[name]();
	});
}
