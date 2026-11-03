import { readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { stdout } from "node:process";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { editJsoncString } from "@howmanysmall/file-utilities/jsonc";

import { loadConfigurationAsync } from "./configuration";
import { formatForStdout, writeFailure, writeSuccess } from "./output";
import { applyEdit, planEdits } from "./references";
import {
	findWorkspaceRoot,
	isTsconfig,
	readProjectsAsync,
	readRootReferencesAsync,
	readWorkspaceGlobsAsync,
} from "./workspace";

import type { Edit } from "./references";

function formatEdit({ add, file, remove }: Edit): string {
	const lines = [
		formatForStdout("bold", file),
		...add.map((path) => formatForStdout("green", `  + ${path}`)),
		...remove.map((path) => formatForStdout("red", `  - ${path}`)),
	];

	return `${lines.join("\n")}\n`;
}

async function renderEditAsync(root: string, edit: Edit): Promise<readonly [path: string, content: string]> {
	const path = nodePath.join(root, edit.file);
	const content = editJsoncString(await readFile(path, "utf8"), isTsconfig.assert, ({ references = [], ...rest }) => {
		const updated = applyEdit(references, edit);
		return updated.length > 0 ? { ...rest, references: updated } : rest;
	});

	return [path, content];
}

async function planWorkspaceAsync(root: string, cwd: string, configFile?: string): Promise<ReadonlyArray<Edit>> {
	const { configuration } = await loadConfigurationAsync({ configFile, cwd, root });

	const ignore = configuration.ignore ?? [];
	const workspaceGlobs = await readWorkspaceGlobsAsync(root);
	const [projects, rootReferences] = await Promise.all([
		readProjectsAsync(root, workspaceGlobs, ignore),
		readRootReferencesAsync(root),
	]);

	return planEdits({ ignore, projects, rootReferences, workspaceGlobs });
}

export interface SyncOptions {
	/** Reports stale references instead of writing them. */
	readonly check?: boolean | undefined;
	/** A `--config` file, if one was passed. */
	readonly configFile?: string | undefined;
	/** The directory the command runs in. */
	readonly cwd: string;
}

/**
 * Brings the workspace's tsconfig references in line with its `workspace:`
 * dependencies, or reports what would change.
 *
 * @param options - How to run.
 * @param options.check - Whether to only report stale references.
 * @param options.configFile - A `--config` file, if one was passed.
 * @param options.cwd - The directory the command runs in.
 * @returns The exit code: 1 when `check` finds stale references, otherwise 0.
 * @rejects {Error} When the workspace or its configuration can't be read.
 */
export async function syncReferencesAsync({ check = false, configFile, cwd }: SyncOptions): Promise<number> {
	const root = findWorkspaceRoot(cwd);
	const edits = await planWorkspaceAsync(root, cwd, configFile);
	if (edits.length === 0) {
		writeSuccess("all tsconfig references are in sync");
		return 0;
	}

	// Rendered before the first write, so a bad file means no writes.
	const rendered = check ? [] : await Promise.all(edits.map(async (edit) => renderEditAsync(root, edit)));

	// oxlint-disable-next-line unicorn/no-array-callback-reference -- this has one parameter.
	stdout.write(edits.map(formatEdit).join(""));

	const files = `${edits.length} ${toPlural(edits.length, "file")}`;
	if (check) {
		writeFailure(`${files} out of sync; run footnote to fix`);
		return 1;
	}

	await Promise.all(rendered.map(async ([path, content]) => writeFile(path, content, "utf8")));
	writeSuccess(`synced ${files}`);
	return 0;
}
