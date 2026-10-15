import { describe, it } from "vitest";

import { editInEditorAsync, getEditor } from "./edit-in-editor";

/**
 * Builds a stand-in editor; the shell runs it with the file path as `$0`.
 *
 * @param script - Shell code that edits `"$0"`.
 * @returns An editor command for `editInEditorAsync`.
 */
function createEditor(script: string): string {
	return `sh -c '${script}'`;
}

describe("editInEditorAsync", () => {
	it("returns what the editor wrote, trimmed", async ({ expect }) => {
		expect.assertions(1);

		const editor = createEditor(String.raw`printf "\n  a cat in a hat  \n" > "$0"`);

		await expect(editInEditorAsync(editor)).resolves.toBe("a cat in a hat");
	});

	it("starts from the given text", async ({ expect }) => {
		expect.assertions(1);

		const editor = createEditor(String.raw`printf " and a bat" >> "$0"`);

		await expect(editInEditorAsync(editor, "a cat")).resolves.toBe("a cat and a bat");
	});

	it("returns nothing for an empty file or a failing editor", async ({ expect }) => {
		expect.assertions(2);

		await expect(editInEditorAsync(createEditor(': > "$0"'))).resolves.toBeUndefined();
		await expect(editInEditorAsync("false")).resolves.toBeUndefined();
	});
});

describe("getEditor", () => {
	it("prefers VISUAL over EDITOR and ignores blank values", ({ expect }) => {
		expect.assertions(3);

		expect(getEditor({ EDITOR: "vi", VISUAL: "code --wait" })).toBe("code --wait");
		expect(getEditor({ EDITOR: "vi" })).toBe("vi");
		expect(getEditor({ EDITOR: " " })).toBeUndefined();
	});
});
