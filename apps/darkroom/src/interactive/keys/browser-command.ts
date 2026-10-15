import type { BrowserKey } from "./browser-keys";

export const enum CommandGroup {
	/** Things to do with the selection; listed in the command palette. */
	Act = "act",
	/** Moving through the list; listed in help only. */
	Navigate = "navigate",
}

/**
 * Something a browser can do. One table of these drives the key bindings,
 * the status bar's hints, the help dialog, and the command palette, so they
 * always agree.
 */
export interface BrowserCommand {
	readonly key: BrowserKey;
	/** Says more after the title in the palette, like `undo later images`. */
	readonly description?: string | undefined;
	readonly group: CommandGroup;
	/** Shown in the status bar as well as help and the palette. */
	readonly isFeatured?: boolean | undefined;
	/** The key as shown, like `⏎` or `y`. */
	readonly keyLabel: string;
	readonly run: () => void;
	/** Says what it does, like `Copy run ID`. */
	readonly title: string;
}

/**
 * Finds the command a key runs.
 *
 * @param commands - The browser's commands.
 * @param key - The binding of the pressed key.
 * @returns The command, or `undefined` when the key does nothing here.
 */
export function findCommand(commands: ReadonlyArray<BrowserCommand>, key?: BrowserKey): BrowserCommand | undefined {
	return key === undefined ? undefined : commands.find((command) => command.key === key);
}
