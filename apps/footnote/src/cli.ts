/**
 * Keeps `references` in a pnpm workspace's tsconfig files in line with its
 * `workspace:` dependencies. References footnote does not manage are left as
 * they are.
 */
import { readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import process, { argv, cwd, stdout } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { editJsoncString } from "@howmanysmall/file-utilities/jsonc";

import { description, version } from "$constants";

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

const scriptName = getScriptName(true);

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

const command = createBaseCommand(scriptName, version, description)
	.option("--check", "Report stale references and exit 1 instead of writing them.")
	.option("-c, --config <file:file>", "Load this configuration file instead of searching the workspace root.")
	.action(async ({ check, config }) => {
		const root = findWorkspaceRoot(cwd());
		const { configuration } = await loadConfigurationAsync({ configFile: config, cwd: cwd(), root });

		const ignore = configuration.ignore ?? [];
		const workspaceGlobs = await readWorkspaceGlobsAsync(root);
		const [projects, rootReferences] = await Promise.all([
			readProjectsAsync(root, workspaceGlobs, ignore),
			readRootReferencesAsync(root),
		]);

		const edits = planEdits({ ignore, projects, rootReferences, workspaceGlobs });
		if (edits.length === 0) {
			writeSuccess("all tsconfig references are in sync");
			return;
		}

		// Rendered before the first write, so a bad file means no writes.
		const rendered = check ? [] : await Promise.all(edits.map(async (edit) => renderEditAsync(root, edit)));

		// oxlint-disable-next-line unicorn/no-array-callback-reference -- this has one parameter.
		stdout.write(edits.map(formatEdit).join(""));

		const files = `${edits.length} ${toPlural(edits.length, "file")}`;
		if (check) {
			writeFailure(`${files} out of sync; run ${scriptName} to fix`);
			process.exitCode = 1;
			return;
		}

		await Promise.all(rendered.map(async ([path, content]) => writeFile(path, content, "utf8")));
		writeSuccess(`synced ${files}`);
	})
	.command("initialize", async () => {
		const { initializeCommand } = await import("./initialize");
		return initializeCommand;
	})
	.alias("init")
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
