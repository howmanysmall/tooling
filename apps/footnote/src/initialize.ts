import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { cwd, stdout } from "node:process";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { SUPPORTED_EXTENSIONS } from "c12";

import { writeDetail, writeSuccess, writeWarning } from "./output";
import { findWorkspaceRoot, readNonCompositeProjectsAsync, readWorkspaceGlobsAsync } from "./workspace";

import type { Configuration } from "./index";

const CONFIGURATION_FILE = "footnote.config.json";

// The same candidates c12 checks in the workspace root.
const CONFIGURATION_FILES = SUPPORTED_EXTENSIONS.flatMap((extension) => [
	`footnote.config${extension}`,
	`.config/footnote${extension}`,
	`.config/footnote.config${extension}`,
]);

function toConfigurationJson(ignore: ReadonlyArray<string>): string {
	const configuration: Configuration = ignore.length > 0 ? { ignore } : {};
	return `${JSON.stringify(configuration, undefined, "\t")}\n`;
}

function reportIgnored(ignore: ReadonlyArray<string>): void {
	if (ignore.length === 0) {
		writeSuccess("every project has composite: true, so none were ignored");
		return;
	}

	writeSuccess(`ignored ${ignore.length} ${toPlural(ignore.length, "project")} without composite: true`);

	for (const directory of ignore) {
		writeDetail(`  ${directory}`);
	}
}

/** The `initialize` subcommand, which writes a starting configuration file. */
export const initializeCommand = createBaseCommand(
	"initialize",
	undefined,
	`Write ${CONFIGURATION_FILE} in the workspace root, ignoring every project whose tsconfig lacks composite: true. Prints the written path on stdout.`,
)
	.option("-f, --force", "Overwrite an existing configuration file.")
	.option("-n, --dry-run", "Print the JSON that would be written on stdout; write nothing.")
	.example("Write the file", "footnote initialize")
	.example("Preview the file", "footnote initialize --dry-run")
	.action(async ({ dryRun, force }) => {
		const root = findWorkspaceRoot(cwd());
		const workspaceGlobs = await readWorkspaceGlobsAsync(root);

		const path = nodePath.join(root, CONFIGURATION_FILE);
		const existing = CONFIGURATION_FILES.filter((file) => existsSync(nodePath.join(root, file)));

		const [firstExisting] = existing;
		if (firstExisting !== undefined && force !== true) {
			throw new CliError(`${nodePath.join(root, firstExisting)} already exists; pass --force to overwrite`, 1);
		}

		const ignore = await readNonCompositeProjectsAsync(root, workspaceGlobs);
		const json = toConfigurationJson(ignore);

		if (dryRun === true) {
			stdout.write(json);
			return;
		}

		for (const other of existing) {
			if (other === CONFIGURATION_FILE) continue;

			const otherPath = nodePath.join(root, other);
			writeWarning(`${otherPath} also exists; footnote only loads one configuration file`);
		}

		await writeFile(path, json, "utf8");

		stdout.write(`${path}\n`);
		reportIgnored(ignore);
		writeDetail("run footnote next to sync the references");
	});
