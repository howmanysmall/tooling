import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";

import { createUlid } from "$history/ulid";

/**
 * Picks the user's editor: `$VISUAL`, then `$EDITOR`.
 *
 * @param variables - The environment.
 * @returns The editor command, or `undefined` when neither is set.
 */
export function getEditor(variables: Readonly<Record<string, string | undefined>>): string | undefined {
	const editor = variables.VISUAL ?? variables.EDITOR;
	return editor === undefined || editor.trim() === "" ? undefined : editor;
}

/**
 * Opens a temporary Markdown file in the user's editor and reads back what
 * they wrote. The editor runs through the shell so values like `code --wait`
 * work.
 *
 * @param editor - The editor command.
 * @param initial - Text to start with.
 * @returns The trimmed text, or `undefined` when the editor failed or the file
 *   was left empty.
 */
export async function editInEditorAsync(editor: string, initial = ""): Promise<string | undefined> {
	const file = nodePath.join(tmpdir(), `darkroom-prompt-${createUlid()}.md`);
	await writeFile(file, initial, "utf8");
	try {
		const { status } = spawnSync(`${editor} "${file}"`, { shell: true, stdio: "inherit" });
		if (status !== 0) return undefined;
		const text = await readFile(file, "utf8");
		const trimmed = text.trim();
		return trimmed === "" ? undefined : trimmed;
	} finally {
		await rm(file, { force: true });
	}
}
