import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";

import type { Key } from "ink";

import type { KeyHint } from "$interactive/components/key-hints";
import type { BrowserCommand } from "$interactive/keys/browser-command";

/** What the generate screen can do. */
export interface GenerateActions {
	readonly chooseModel: () => void;
	readonly clearPrompt: () => void;
	/** Closes the session on screen; it stays in the history. */
	readonly closeSession: () => void;
	/** Shows the next tab, or the previous one with a negative `delta`. */
	readonly cycleSessions: (delta: number) => void;
	/** Prices the prompt and asks to confirm before anything is sent. */
	readonly generate: () => void;
	/** Closes the app and asks for references and settings first. */
	readonly generateWithOptions: () => void;
	readonly insertNewLine: () => void;
	readonly newSession: () => void;
	/** Opens the list of past sessions. */
	readonly showSessions: () => void;
	/** Switches between editing the image above and starting fresh. */
	readonly toggleMode: () => void;
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
		{ key: BrowserKey.Sessions, group, keyLabel: "ctrl+s", run: actions.showSessions, title: "Sessions" },
		{ key: BrowserKey.CloseSession, group, keyLabel: "", run: actions.closeSession, title: "Close session" },
		{
			key: BrowserKey.NextSession,
			group: CommandGroup.Navigate,
			keyLabel: "alt+↓",
			run(): void {
				actions.cycleSessions(1);
			},
			title: "Next session",
		},
		{
			key: BrowserKey.PreviousSession,
			group: CommandGroup.Navigate,
			keyLabel: "alt+↑",
			run(): void {
				actions.cycleSessions(-1);
			},
			title: "Previous session",
		},
		{
			key: BrowserKey.Guided,
			group,
			keyLabel: "ctrl+g",
			run: actions.generateWithOptions,
			title: "Generate with references and options",
		},
		{
			key: BrowserKey.ToggleMode,
			group,
			keyLabel: "shift+tab",
			run: actions.toggleMode,
			title: "Edit the image, or start fresh",
		},
		{ key: BrowserKey.NewLine, group, keyLabel: "ctrl+j", run: actions.insertNewLine, title: "New line" },
		{ key: BrowserKey.ClearPrompt, group, keyLabel: "ctrl+c", run: actions.clearPrompt, title: "Clear prompt" },
	];
}

/** What the prompt box's next prompt builds on, for its key hints. */
export const enum PromptBasis {
	/** An image above, but the model can't take it. */
	CantEdit = "cant-edit",
	/** An image above, which the prompt edits. */
	Editing = "editing",
	/** An image above, which the prompt leaves alone. */
	Fresh = "fresh",
	/** No image yet, so the prompt can only start fresh. */
	Nothing = "nothing",
}

/**
 * The hints under the prompt box: always how to generate, break a line,
 * and pick a model, and once there is an image, how to switch between
 * editing it and starting fresh. A model that can't edit points to ctrl+o.
 *
 * @param basis - What the next prompt builds on.
 * @returns The hints, left to right.
 */
export function getBoxHints(basis: PromptBasis): Array<KeyHint> {
	const hints: Array<KeyHint> = [
		["⏎", "generate"],
		["ctrl+j", "new line"],
		["ctrl+o", basis === PromptBasis.CantEdit ? "a model that edits" : "model"],
	];

	if (basis === PromptBasis.Fresh) {
		hints.push(["shift+tab", "edit"]);
	} else if (basis !== PromptBasis.Nothing) {
		hints.push(["shift+tab", "start fresh"]);
	}

	return hints;
}

const CTRL_KEYS: ReadonlyMap<string, BrowserKey> = new Map([
	["g", BrowserKey.Guided],
	["n", BrowserKey.NewSession],
	["o", BrowserKey.ChooseModel],
	["s", BrowserKey.Sessions],
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
	if (key.meta && key.upArrow) return BrowserKey.PreviousSession;
	if (key.meta && key.downArrow) return BrowserKey.NextSession;
	return key.ctrl ? CTRL_KEYS.get(input) : undefined;
}
