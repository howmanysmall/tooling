import type { Key } from "ink";

export const enum BrowserKey {
	BatchNext = "batch-next",
	BatchPrevious = "batch-previous",
	ChooseModel = "choose-model",
	ClearPrompt = "clear-prompt",
	CloseSession = "close-session",
	Copy = "copy",
	Delete = "delete",
	Down = "down",
	Example = "example",
	Filter = "filter",
	First = "first",
	Generate = "generate",
	Guided = "guided",
	Help = "help",
	ImageCopy = "image-copy",
	ImageCopyPath = "image-copy-path",
	ImageDelete = "image-delete",
	ImageEdit = "image-edit",
	ImageOpen = "image-open",
	Last = "last",
	NewLine = "new-line",
	NewSession = "new-session",
	NextSession = "next-session",
	NextTab = "next-tab",
	Open = "open",
	PageDown = "page-down",
	PageUp = "page-up",
	PreviousSession = "previous-session",
	PromptCopy = "prompt-copy",
	PromptDelete = "prompt-delete",
	PromptFork = "prompt-fork",
	PromptReuse = "prompt-reuse",
	PromptRewind = "prompt-rewind",
	Quit = "quit",
	Rerun = "rerun",
	Sessions = "sessions",
	ShowGenerate = "show-generate",
	ShowHistory = "show-history",
	ShowModels = "show-models",
	Sort = "sort",
	ToggleMode = "toggle-mode",
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
	["h", BrowserKey.BatchPrevious],
	["j", BrowserKey.Down],
	["k", BrowserKey.Up],
	["l", BrowserKey.BatchNext],
	["o", BrowserKey.Open],
	["q", BrowserKey.Quit],
	["r", BrowserKey.Rerun],
	["s", BrowserKey.Sort],
	["y", BrowserKey.Copy],
]);

const SPECIAL_KEYS: ReadonlyArray<readonly [keyof Key, BrowserKey]> = [
	["upArrow", BrowserKey.Up],
	["downArrow", BrowserKey.Down],
	["leftArrow", BrowserKey.BatchPrevious],
	["rightArrow", BrowserKey.BatchNext],
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
