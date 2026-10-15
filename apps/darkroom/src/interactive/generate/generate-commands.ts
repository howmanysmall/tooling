import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";

import type { Key } from "ink";

import type { BrowserCommand } from "$interactive/keys/browser-command";

/** What the generate screen can do. */
export interface GenerateActions {
	readonly chooseModel: () => void;
	readonly clearPrompt: () => void;
	/** Prices the prompt and asks to confirm before anything is sent. */
	readonly generate: () => void;
	/** Closes the app and asks for references and settings first. */
	readonly generateWithOptions: () => void;
	readonly insertNewLine: () => void;
	readonly newSession: () => void;
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
		{ key: BrowserKey.NewSession, group, keyLabel: "ctrl+n", run: actions.newSession, title: "New session" },
		{
			key: BrowserKey.Guided,
			group,
			keyLabel: "ctrl+g",
			run: actions.generateWithOptions,
			title: "Generate with references and options",
		},
		{ key: BrowserKey.NewLine, group, keyLabel: "ctrl+j", run: actions.insertNewLine, title: "New line" },
		{ key: BrowserKey.ClearPrompt, group, keyLabel: "ctrl+c", run: actions.clearPrompt, title: "Clear prompt" },
	];
}

const CTRL_KEYS: ReadonlyMap<string, BrowserKey> = new Map([
	["g", BrowserKey.Guided],
	["n", BrowserKey.NewSession],
	["o", BrowserKey.ChooseModel],
]);

/**
 * Maps a key press on the generate screen to a command. Everything else is
 * the prompt box's. `ctrl+c` is the shell's: it clears the prompt, or quits
 * when the prompt is empty.
 *
 * @param input - The typed character, if any.
 * @param key - Ink's description of the key.
 * @returns The binding, or `undefined` for the prompt box to handle.
 */
export function getGenerateKey(input: string, key: Key): BrowserKey | undefined {
	if (key.return) return key.meta || key.shift ? undefined : BrowserKey.Generate;
	return key.ctrl ? CTRL_KEYS.get(input) : undefined;
}
