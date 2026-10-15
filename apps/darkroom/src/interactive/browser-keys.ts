import type { Key } from "ink";

export const enum BrowserKey {
	ChooseModel = "choose-model",
	ClearPrompt = "clear-prompt",
	Copy = "copy",
	Delete = "delete",
	Down = "down",
	Example = "example",
	Filter = "filter",
	First = "first",
	Generate = "generate",
	Guided = "guided",
	Help = "help",
	Last = "last",
	NewLine = "new-line",
	NextTab = "next-tab",
	Open = "open",
	PageDown = "page-down",
	PageUp = "page-up",
	Quit = "quit",
	Rerun = "rerun",
	ShowGenerate = "show-generate",
	ShowHistory = "show-history",
	ShowModels = "show-models",
	Sort = "sort",
	Up = "up",
}

const CHARACTER_KEYS: ReadonlyMap<string, BrowserKey> = new Map([
	["1", BrowserKey.ShowGenerate],
	["2", BrowserKey.ShowHistory],
	["3", BrowserKey.ShowModels],
	["/", BrowserKey.Filter],
	["d", BrowserKey.Delete],
	["e", BrowserKey.Example],
	["G", BrowserKey.Last],
	["g", BrowserKey.First],
	["j", BrowserKey.Down],
	["k", BrowserKey.Up],
	["o", BrowserKey.Open],
	["q", BrowserKey.Quit],
	["r", BrowserKey.Rerun],
	["s", BrowserKey.Sort],
	["y", BrowserKey.Copy],
]);

const SPECIAL_KEYS: ReadonlyArray<readonly [keyof Key, BrowserKey]> = [
	["upArrow", BrowserKey.Up],
	["downArrow", BrowserKey.Down],
	["pageUp", BrowserKey.PageUp],
	["pageDown", BrowserKey.PageDown],
	["home", BrowserKey.First],
	["end", BrowserKey.Last],
	["return", BrowserKey.Open],
	["escape", BrowserKey.Quit],
];

/**
 * Maps a key press in a browser's list to what it does. Each browser binds
 * only the keys it uses.
 *
 * @param input - The typed character, if any.
 * @param key - Ink's description of the key.
 * @returns The binding, or `undefined` for keys that do nothing.
 */
export function getBrowserKey(input: string, key: Key): BrowserKey | undefined {
	if (key.ctrl || key.meta) return undefined;
	for (const [name, binding] of SPECIAL_KEYS) if (key[name] === true) return binding;
	return CHARACTER_KEYS.get(input);
}

/**
 * Builds the OSC 52 sequence that asks the terminal to put text on the
 * clipboard. Terminals that don't support it ignore it.
 *
 * @param text - What to copy.
 * @returns The escape sequence.
 */
export function formatClipboardSequence(text: string): string {
	return `\u001B]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`;
}
