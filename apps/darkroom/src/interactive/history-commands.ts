import { CommandGroup } from "./browser-command";
import { BrowserKey } from "./browser-keys";
import { getNavigationCommands } from "./cursor-actions";

import type { BrowserCommand } from "./browser-command";
import type { RowNames } from "./cursor-actions";
import type { HistoryBrowserActions } from "./history-browser-context";

const ROW_NAMES: RowNames = { first: "Newest run", item: "run", last: "Oldest run" };

/**
 * Everything the history browser can do from the keyboard, with its keys.
 *
 * @param actions - The browser's actions.
 * @returns The commands, actions first, in the order help lists them.
 */
export function getHistoryCommands(actions: HistoryBrowserActions): Array<BrowserCommand> {
	const group = CommandGroup.Act;
	return [
		{ key: BrowserKey.Filter, group, isFeatured: true, keyLabel: "/", run: actions.openFilter, title: "Filter" },
		{
			key: BrowserKey.Open,
			group,
			isFeatured: true,
			keyLabel: "⏎",
			run: actions.openSelected,
			title: "Open images",
		},
		{ key: BrowserKey.Rerun, group, isFeatured: true, keyLabel: "r", run: actions.rerunSelected, title: "Re-run" },
		{ key: BrowserKey.Copy, group, keyLabel: "y", run: actions.copySelected, title: "Copy run ID" },
		{ key: BrowserKey.Delete, group, keyLabel: "d", run: actions.askDelete, title: "Delete run" },
		{ key: BrowserKey.Quit, group, keyLabel: "q", run: actions.quit, title: "Quit" },
		...getNavigationCommands(actions, ROW_NAMES),
		{
			key: BrowserKey.BatchPrevious,
			group: CommandGroup.Navigate,
			keyLabel: "← h",
			run: actions.showPreviousInBatch,
			title: "Previous compared model",
		},
		{
			key: BrowserKey.BatchNext,
			group: CommandGroup.Navigate,
			keyLabel: "→ l",
			run: actions.showNextInBatch,
			title: "Next compared model",
		},
	];
}
