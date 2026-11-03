import { describe, it } from "vitest";

import { NO_KEY } from "$interactive/keys/test-key";

import {
	EditorActionType,
	EMPTY_EDITOR,
	getEditorAction,
	reducePromptEditor,
	splitAtCursor,
} from "./prompt-editor-state";

import type { EditorAction, PromptEditor } from "./prompt-editor-state";

function apply(editor: PromptEditor, ...actions: ReadonlyArray<EditorAction>): PromptEditor {
	let next = editor;
	for (const action of actions) {
		next = reducePromptEditor(next, action);
	}

	return next;
}

function at(text: string, cursor: number): PromptEditor {
	return { cursor, text };
}

describe("reducePromptEditor", () => {
	it("types at the cursor and deletes around it", ({ expect }) => {
		expect.assertions(3);

		const typed = apply(
			EMPTY_EDITOR,
			{ text: "a cat", type: EditorActionType.Insert },
			{ type: EditorActionType.Left },
			{ type: EditorActionType.Left },
		);

		expect(typed).toStrictEqual(at("a cat", 3));
		expect(apply(typed, { type: EditorActionType.DeleteBackward })).toStrictEqual(at("a at", 2));
		expect(apply(typed, { type: EditorActionType.DeleteForward })).toStrictEqual(at("a ct", 3));
	});

	it("jumps to the ends of the current line", ({ expect }) => {
		expect.assertions(2);

		const editor = at("first\nsecond line", 9);

		expect(apply(editor, { type: EditorActionType.LineStart }).cursor).toBe(6);
		expect(apply(editor, { type: EditorActionType.LineEnd }).cursor).toBe(17);
	});

	it("moves and deletes by word", ({ expect }) => {
		expect.assertions(3);

		const editor = at("a red fox", 9);

		expect(apply(editor, { type: EditorActionType.WordLeft }).cursor).toBe(6);
		expect(apply(editor, { type: EditorActionType.DeleteWord })).toStrictEqual(at("a red ", 6));
		expect(apply(at("a red fox", 0), { type: EditorActionType.WordRight }).cursor).toBe(1);
	});

	it("keeps the column when moving between lines, within shorter lines", ({ expect }) => {
		expect.assertions(3);

		const editor = at("long line\nab\nanother", 8);

		expect(apply(editor, { type: EditorActionType.Down }).cursor).toBe(12);
		expect(apply(editor, { type: EditorActionType.Down }, { type: EditorActionType.Down }).cursor).toBe(15);
		expect(apply(editor, { type: EditorActionType.Up }).cursor).toBe(8);
	});

	it("steps over an emoji as one character", ({ expect }) => {
		expect.assertions(2);

		const editor = at("cat 🐈‍⬛", "cat 🐈‍⬛".length);

		expect(apply(editor, { type: EditorActionType.Left }).cursor).toBe(4);
		expect(apply(editor, { type: EditorActionType.DeleteBackward })).toStrictEqual(at("cat ", 4));
	});

	it("keeps newlines from a paste but drops other control characters", ({ expect }) => {
		expect.assertions(1);

		expect(apply(EMPTY_EDITOR, { text: "one\r\ntwo\u001B[2~\tthree", type: EditorActionType.Insert }).text).toBe(
			"one\ntwo[2~three",
		);
	});
});

describe("image tokens", () => {
	it("delete in one step, whichever way you come at them", ({ expect }) => {
		expect.assertions(3);

		const editor = at("a fox [Image 1]", 15);

		expect(apply(editor, { type: EditorActionType.DeleteBackward })).toStrictEqual(at("a fox ", 6));
		expect(apply(editor, { type: EditorActionType.DeleteWord })).toStrictEqual(at("a fox ", 6));
		expect(apply(at("a fox [Image 1]", 6), { type: EditorActionType.DeleteForward })).toStrictEqual(
			at("a fox ", 6),
		);
	});
});

describe("splitAtCursor", () => {
	it("puts the cursor on a character, or on a space at a line's end", ({ expect }) => {
		expect.assertions(3);

		expect(splitAtCursor(at("a 🐈‍⬛ cat", 2))).toStrictEqual({ after: " cat", at: "🐈‍⬛", before: "a " });
		expect(splitAtCursor(at("one\ntwo", 3))).toStrictEqual({ after: "\ntwo", at: " ", before: "one" });
		expect(splitAtCursor(at("end", 3))).toStrictEqual({ after: "", at: " ", before: "end" });
	});
});

describe("getEditorAction", () => {
	it("maps the shell's editing keys", ({ expect }) => {
		expect.assertions(5);

		expect(getEditorAction("a", { ...NO_KEY, ctrl: true })).toStrictEqual({ type: EditorActionType.LineStart });
		expect(getEditorAction("e", { ...NO_KEY, ctrl: true })).toStrictEqual({ type: EditorActionType.LineEnd });
		expect(getEditorAction("", { ...NO_KEY, backspace: true, meta: true })).toStrictEqual({
			type: EditorActionType.DeleteWord,
		});
		expect(getEditorAction("b", { ...NO_KEY, meta: true })).toStrictEqual({ type: EditorActionType.WordLeft });
		expect(getEditorAction("x", NO_KEY)).toStrictEqual({ text: "x", type: EditorActionType.Insert });
	});

	it("deletes a word on ctrl or option+backspace, and to the line's start on cmd+backspace", ({ expect }) => {
		expect.assertions(3);

		expect(getEditorAction("", { ...NO_KEY, backspace: true, ctrl: true })).toStrictEqual({
			type: EditorActionType.DeleteWord,
		});
		expect(getEditorAction("", { ...NO_KEY, backspace: true, meta: true })).toStrictEqual({
			type: EditorActionType.DeleteWord,
		});
		expect(getEditorAction("", { ...NO_KEY, backspace: true, super: true })).toStrictEqual({
			type: EditorActionType.DeleteToStart,
		});
	});

	it("adds a line for ctrl+j and alt+enter, but leaves a plain Enter alone", ({ expect }) => {
		expect.assertions(4);

		expect(getEditorAction("\n", NO_KEY)).toStrictEqual({ text: "\n", type: EditorActionType.Insert });
		expect(getEditorAction("j", { ...NO_KEY, ctrl: true })).toStrictEqual({
			text: "\n",
			type: EditorActionType.Insert,
		});
		expect(getEditorAction("", { ...NO_KEY, meta: true, return: true })).toStrictEqual({
			text: "\n",
			type: EditorActionType.Insert,
		});
		expect(getEditorAction("\r", { ...NO_KEY, return: true })).toBeUndefined();
	});
});
