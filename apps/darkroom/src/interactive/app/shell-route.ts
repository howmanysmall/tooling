import type { Key } from "ink";

/** Where the shell sends a key press. */
export const enum ShellRoute {
	/** The screen asked for every key, as its filter or prompt box does. */
	Capture = "capture",
	CloseHelp = "close-help",
	/** A key from the screen's command table, if one is bound. */
	Command = "command",
	/** A dialog reads its own keys; the shell stays out of the way. */
	Ignore = "ignore",
	/** `ctrl+c`: the screen's interrupt, which quits unless it has a use. */
	Interrupt = "interrupt",
	NextTab = "next-tab",
	OpenHelp = "open-help",
	OpenPalette = "open-palette",
	PreviousTab = "previous-tab",
}

/** What the shell knows when a key arrives. */
export interface ShellSituation {
	/** The palette, or a dialog of the screen's own, is open. */
	readonly hasDialog: boolean;
	readonly hasTabs: boolean;
	readonly isCapturing: boolean;
	readonly isHelpOpen: boolean;
}

/**
 * Decides who handles a key. `ctrl+c` always reaches the screen's
 * interrupt; then dialogs come first, any key closes help, and `tab` and
 * `ctrl+p` work even while the screen captures keys, so the prompt box
 * can't trap you.
 *
 * @param input - The typed character, if any.
 * @param key - Ink's description of the key.
 * @param situation - What is open on the screen.
 * @returns Where the key goes.
 */
export function getShellRoute(input: string, key: Key, situation: ShellSituation): ShellRoute {
	if (input === "c" && key.ctrl) return ShellRoute.Interrupt;
	if (situation.hasDialog) return ShellRoute.Ignore;
	if (situation.isHelpOpen) return ShellRoute.CloseHelp;
	return getGlobalRoute(input, key, situation.hasTabs) ?? getScreenRoute(input, situation.isCapturing);
}

function getGlobalRoute(input: string, key: Key, hasTabs: boolean): ShellRoute | undefined {
	if (hasTabs && key.tab) return key.shift ? ShellRoute.PreviousTab : ShellRoute.NextTab;
	return input === "p" && key.ctrl ? ShellRoute.OpenPalette : undefined;
}

function getScreenRoute(input: string, isCapturing: boolean): ShellRoute {
	if (isCapturing) return ShellRoute.Capture;
	return input === "?" ? ShellRoute.OpenHelp : ShellRoute.Command;
}
