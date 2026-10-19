import type { Key } from "ink";

/** The text in the prompt box and where the cursor is, in UTF-16 units. */
export interface PromptEditor {
	readonly cursor: number;
	readonly text: string;
}

export type EditorAction =
	| { readonly text: string; readonly type: "insert" }
	| { readonly type: "clear" }
	| { readonly type: "delete-backward" }
	| { readonly type: "delete-forward" }
	| { readonly type: "delete-to-end" }
	| { readonly type: "delete-to-start" }
	| { readonly type: "delete-word" }
	| { readonly type: "down" }
	| { readonly type: "left" }
	| { readonly type: "line-end" }
	| { readonly type: "line-start" }
	| { readonly type: "right" }
	| { readonly type: "up" }
	| { readonly type: "word-left" }
	| { readonly type: "word-right" };

export const EMPTY_EDITOR: PromptEditor = { cursor: 0, text: "" };

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
// Typed or pasted control characters, except the newline, are dropped.
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u0009\u000B-\u001F\u007F]/gu;
const LINE_BREAKS = /\r\n?/gu;
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

function getBoundaries(text: string): Array<number> {
	return [...Array.from(segmenter.segment(text), ({ index }) => index), text.length];
}

function getPreviousBoundary(text: string, index: number): number {
	return getBoundaries(text).findLast((boundary) => boundary < index) ?? 0;
}

function getNextBoundary(text: string, index: number): number {
	return getBoundaries(text).find((boundary) => boundary > index) ?? text.length;
}

function isWordAt(text: string, index: number): boolean {
	return WORD_CHARACTER.test(text.charAt(index));
}

function getWordStart(text: string, index: number): number {
	let start = index;
	while (start > 0 && !isWordAt(text, start - 1)) start -= 1;
	while (start > 0 && isWordAt(text, start - 1)) start -= 1;
	return start;
}

function getWordEnd(text: string, index: number): number {
	let end = index;
	while (end < text.length && !isWordAt(text, end)) end += 1;
	while (end < text.length && isWordAt(text, end)) end += 1;
	return end;
}

function getLineStart(text: string, index: number): number {
	return text.lastIndexOf("\n", index - 1) + 1;
}

function getLineEnd(text: string, index: number): number {
	const end = text.indexOf("\n", index);
	return end === -1 ? text.length : end;
}

/**
 * Moves to the line above or below, keeping the column where that line is
 * long enough.
 *
 * @param text - The prompt.
 * @param index - The cursor.
 * @param delta - `-1` for up, `1` for down.
 * @returns The new cursor, or the same one on the first or last line.
 */
function moveLine(text: string, index: number, delta: number): number {
	const start = getLineStart(text, index);
	const column = index - start;
	if (delta < 0) {
		if (start === 0) return index;
		const previousStart = getLineStart(text, start - 1);
		return Math.min(previousStart + column, start - 1);
	}

	const end = getLineEnd(text, index);
	if (end === text.length) return index;
	return Math.min(end + 1 + column, getLineEnd(text, end + 1));
}

function cleanInsert(text: string): string {
	return text.replaceAll(LINE_BREAKS, "\n").replaceAll(CONTROL_CHARACTERS, "");
}

function splice({ text }: PromptEditor, from: number, to: number, insert = ""): PromptEditor {
	const next = text.slice(0, from) + insert + text.slice(to);
	return { cursor: from + insert.length, text: next };
}

function getCursorTarget({ cursor, text }: PromptEditor, action: EditorAction): number | undefined {
	switch (action.type) {
		case "down":
			return moveLine(text, cursor, 1);

		case "left":
			return getPreviousBoundary(text, cursor);

		case "line-end":
			return getLineEnd(text, cursor);

		case "line-start":
			return getLineStart(text, cursor);

		case "right":
			return getNextBoundary(text, cursor);

		case "up":
			return moveLine(text, cursor, -1);

		case "word-left":
			return getWordStart(text, cursor);

		case "word-right":
			return getWordEnd(text, cursor);

		default:
			return undefined;
	}
}

/**
 * Applies one edit or cursor move. Moves and deletes respect graphemes, so
 * an emoji is one step.
 *
 * @param editor - The text and cursor.
 * @param action - What was typed or pressed.
 * @returns The next text and cursor.
 */
export function reducePromptEditor(editor: PromptEditor, action: EditorAction): PromptEditor {
	const { cursor, text } = editor;
	switch (action.type) {
		case "clear":
			return EMPTY_EDITOR;

		case "delete-backward":
			return splice(editor, getPreviousBoundary(text, cursor), cursor);

		case "delete-forward":
			return splice(editor, cursor, getNextBoundary(text, cursor));

		case "delete-to-end":
			return splice(editor, cursor, getLineEnd(text, cursor));

		case "delete-to-start":
			return splice(editor, getLineStart(text, cursor), cursor);

		case "delete-word":
			return splice(editor, getWordStart(text, cursor), cursor);

		case "insert":
			return splice(editor, cursor, cursor, cleanInsert(action.text));

		default:
			return { cursor: getCursorTarget(editor, action) ?? cursor, text };
	}
}

const DELETE_FORWARD: EditorAction = { type: "delete-forward" };
const DELETE_WORD: EditorAction = { type: "delete-word" };
const LINE_END: EditorAction = { type: "line-end" };
const LINE_START: EditorAction = { type: "line-start" };
const NEW_LINE: EditorAction = { text: "\n", type: "insert" };
const WORD_LEFT: EditorAction = { type: "word-left" };
const WORD_RIGHT: EditorAction = { type: "word-right" };

/** The prompt split around the cursor, to draw the cursor over a character. */
export interface CursorSplit {
	readonly after: string;
	/** The character under the cursor, or a space at the end of a line. */
	readonly at: string;
	readonly before: string;
}

/**
 * Splits the prompt around the cursor. At a line break or the end, the
 * cursor sits on a space, so it shows without moving the text.
 *
 * @param editor - The text and cursor.
 * @param editor.cursor - Where the cursor is.
 * @param editor.text - The prompt.
 * @returns The text before, under, and after the cursor.
 */
export function splitAtCursor({ cursor, text }: PromptEditor): CursorSplit {
	const before = text.slice(0, cursor);
	const end = getNextBoundary(text, cursor);
	const at = text.slice(cursor, end);
	// oxlint-disable-next-line unicorn-js/prefer-simple-condition-first -- not "simpler". slower.
	if (at.length === 0 || at === "\n") {
		return { after: text.slice(cursor), at: " ", before };
	}

	return { after: text.slice(end), at, before };
}

const CTRL_ACTIONS: ReadonlyMap<string, EditorAction> = new Map<string, EditorAction>([
	["a", LINE_START],
	["b", { type: "left" }],
	["d", DELETE_FORWARD],
	["e", LINE_END],
	["f", { type: "right" }],
	["k", { type: "delete-to-end" }],
	["u", { type: "delete-to-start" }],
	["w", DELETE_WORD],
]);

const META_ACTIONS: ReadonlyMap<string, EditorAction> = new Map<string, EditorAction>([
	["b", WORD_LEFT],
	["f", WORD_RIGHT],
]);

const SPECIAL_ACTIONS: ReadonlyArray<readonly [keyof Key, EditorAction]> = [
	["upArrow", { type: "up" }],
	["downArrow", { type: "down" }],
	["home", LINE_START],
	["end", LINE_END],
	["delete", DELETE_FORWARD],
];

/**
 * Maps the keys that aren't typing: backspace, the arrows, and the like.
 *
 * @param key - Ink's description of the key.
 * @returns The edit, or `undefined` when the key is typing or unused.
 */
function getSpecialAction(key: Key): EditorAction | undefined {
	if (key.backspace) {
		return key.meta ? DELETE_WORD : { type: "delete-backward" };
	}

	const isWordStep = key.meta || key.ctrl;
	if (key.leftArrow) {
		return isWordStep ? WORD_LEFT : { type: "left" };
	}

	if (key.rightArrow) {
		return isWordStep ? WORD_RIGHT : { type: "right" };
	}

	return SPECIAL_ACTIONS.find(([name]) => key[name] === true)?.[1];
}

/**
 * Maps a key press in the prompt box to an edit, with the usual shell keys:
 * `ctrl+a`/`ctrl+e` for the line's ends, `ctrl+w` and `alt+backspace` to
 * delete a word, `ctrl+u`/`ctrl+k` to delete to either end, and `ctrl+j`,
 * `alt+enter`, or `shift+enter` for a new line. A plain Enter is not an edit.
 *
 * @param input - The typed text, if any.
 * @param key - Ink's description of the key.
 * @returns The edit, or `undefined` for keys the box doesn't use.
 */
export function getEditorAction(input: string, key: Key): EditorAction | undefined {
	if (key.return) {
		return key.meta || key.shift ? NEW_LINE : undefined;
	}
	return getSpecialAction(key) ?? getModifiedAction(input, key);
}

function getModifiedAction(input: string, key: Key): EditorAction | undefined {
	if (key.ctrl) return CTRL_ACTIONS.get(input);
	if (key.meta) return META_ACTIONS.get(input);
	return getTypedAction(input, key);
}

function getTypedAction(input: string, key: Key): EditorAction | undefined {
	if (input === "\n") return NEW_LINE;
	if (input.length === 0 || key.escape || key.tab) return undefined;
	return { text: input, type: "insert" };
}
