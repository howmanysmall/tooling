import { CommandGroup } from "./browser-command";
import { BrowserKey } from "./browser-keys";

import type { Key } from "ink";

import type { BrowserCommand } from "./browser-command";

/** What the generate screen can do. */
export interface GenerateActions {
	readonly chooseModel: () => void;
	readonly clearPrompt: () => void;
	/** Closes the app and asks before spending, with the estimated cost. */
	readonly generate: () => void;
	/** Closes the app and asks for references and settings first. */
	readonly generateWithOptions: () => void;
	readonly insertNewLine: () => void;
	readonly quit: () => void;
}

/**
 * Everything the generate screen can do, with its keys. The prompt box
 * takes the typing, so each key here holds a modifier or isn't printable.
 *
 * @param actions - The screen's actions.
 * @returns The commands, in the order help lists them.
 */
export function getGenerateCommands(actions: GenerateActions): Array<BrowserCommand> {
	const group = CommandGroup.Act;
	return [
		{ key: BrowserKey.Generate, group, isFeatured: true, keyLabel: "⏎", run: actions.generate, title: "Generate" },
		{
			key: BrowserKey.ChooseModel,
			group,
			isFeatured: true,
			keyLabel: "ctrl+o",
			run: actions.chooseModel,
			title: "Choose model",
		},
		{
			key: BrowserKey.Guided,
			group,
			keyLabel: "ctrl+g",
			run: actions.generateWithOptions,
			title: "Generate with references and options",
		},
		{ key: BrowserKey.NewLine, group, keyLabel: "ctrl+j", run: actions.insertNewLine, title: "New line" },
		{ key: BrowserKey.ClearPrompt, group, keyLabel: "esc", run: actions.clearPrompt, title: "Clear prompt" },
		{ key: BrowserKey.Quit, group, keyLabel: "ctrl+c", run: actions.quit, title: "Quit" },
	];
}

/**
 * Maps a key press on the generate screen to a command. Everything else is
 * the prompt box's.
 *
 * @param input - The typed character, if any.
 * @param key - Ink's description of the key.
 * @returns The binding, or `undefined` for the prompt box to handle.
 */
export function getGenerateKey(input: string, key: Key): BrowserKey | undefined {
	if (key.return) return key.meta || key.shift ? undefined : BrowserKey.Generate;
	if (key.escape) return BrowserKey.ClearPrompt;
	if (!key.ctrl) return undefined;
	if (input === "o") return BrowserKey.ChooseModel;
	return input === "g" ? BrowserKey.Guided : undefined;
}
