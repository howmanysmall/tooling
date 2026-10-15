import { CommandGroup } from "./browser-command";
import { BrowserKey } from "./browser-keys";
import { getNavigationCommands } from "./cursor-actions";

import type { BrowserCommand } from "./browser-command";
import type { RowNames } from "./cursor-actions";
import type { ModelBrowserActions } from "./model-browser-context";

const ROW_NAMES: RowNames = { first: "First model", item: "model", last: "Last model" };

/**
 * Everything the model browser can do from the keyboard, with its keys.
 *
 * @param actions - The browser's actions.
 * @returns The commands, actions first, in the order help lists them.
 */
export function getModelCommands(actions: ModelBrowserActions): Array<BrowserCommand> {
	const group = CommandGroup.Act;
	return [
		{ key: BrowserKey.Filter, group, isFeatured: true, keyLabel: "/", run: actions.openFilter, title: "Filter" },
		{ key: BrowserKey.Sort, group, isFeatured: true, keyLabel: "s", run: actions.cycleSort, title: "Sort" },
		{
			key: BrowserKey.Open,
			group,
			isFeatured: true,
			keyLabel: "⏎",
			run: actions.chooseSelected,
			title: "Generate",
		},
		{ key: BrowserKey.Example, group, keyLabel: "e", run: actions.switchExample, title: "Switch example image" },
		{ key: BrowserKey.Copy, group, keyLabel: "y", run: actions.copySelected, title: "Copy model ID" },
		{ key: BrowserKey.Quit, group, keyLabel: "q", run: actions.quit, title: "Quit" },
		...getNavigationCommands(actions, ROW_NAMES),
	];
}
