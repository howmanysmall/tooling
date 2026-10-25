import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";

import { APP_TABS, AppTab } from "./app-tab";

import type { BrowserCommand } from "$interactive/keys/browser-command";

import type { AppTabs } from "./app-tabs-context";

/** What the shell adds to a screen's commands. */
export interface ShellExtras {
	/**
	 * The screen takes the typing, as the prompt box does, so `?` and the
	 * number keys type instead; their commands run from the palette only.
	 */
	readonly isTyping: boolean;
	/** Opens the help dialog. */
	readonly showKeys: () => void;
	/** The app's tabs, or `undefined` for a screen on its own. */
	readonly tabs?: AppTabs | undefined;
}

const SHOW_KEYS: Readonly<Record<AppTab, BrowserKey>> = {
	[AppTab.Generate]: BrowserKey.ShowGenerate,
	[AppTab.History]: BrowserKey.ShowHistory,
	[AppTab.Models]: BrowserKey.ShowModels,
};

/**
 * The commands that switch tabs: a number key for each other tab, and
 * `tab` for the next one.
 *
 * @param tabs - The app's tabs.
 * @param isTyping - Whether the number keys type instead.
 * @returns A command per other tab, then the next-tab command.
 */
function getTabCommands(tabs: AppTabs, isTyping: boolean): Array<BrowserCommand> {
	const shown = APP_TABS.flatMap((tab, index): Array<BrowserCommand> => {
		if (tab === tabs.active) {
			return [];
		}

		return [
			{
				key: SHOW_KEYS[tab],
				group: CommandGroup.Act,
				keyLabel: isTyping ? "" : String(index + 1),
				run(): void {
					tabs.select(tab);
				},
				title: `Go to ${tab}`,
			},
		];
	});

	return [
		...shown,
		{
			key: BrowserKey.NextTab,
			group: CommandGroup.Navigate,
			keyLabel: "tab",
			run(): void {
				tabs.cycle(1);
			},
			title: "Next tab",
		},
	];
}

/**
 * A screen's commands with the ones the shell adds: showing the keys, and
 * switching tabs when the screen is in the app.
 *
 * @param commands - The screen's own commands.
 * @param extras - What the shell adds, and whether the screen takes typing.
 * @param extras.isTyping - Whether `?` and the number keys type instead.
 * @param extras.showKeys - Opens the help dialog.
 * @param extras.tabs - The app's tabs, if the screen is in the app.
 * @returns Every command the screen answers to.
 */
export function getShellCommands(
	commands: ReadonlyArray<BrowserCommand>,
	{ isTyping, showKeys, tabs }: ShellExtras,
): Array<BrowserCommand> {
	return [
		...commands,
		{
			key: BrowserKey.Help,
			group: CommandGroup.Act,
			keyLabel: isTyping ? "" : "?",
			run: showKeys,
			title: "Show keys",
		},
		...(tabs === undefined ? [] : getTabCommands(tabs, isTyping)),
	];
}
