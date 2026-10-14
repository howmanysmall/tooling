import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { argv, cwd, execPath, exit } from "node:process";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";
import { type } from "arktype";
import { loadBumpConfig, versionBump } from "bumpp";
import { consola } from "consola";
import { exec } from "tinyexec";

import type { VersionBumpOptions, VersionBumpRelease } from "bumpp";

const scriptName = getScriptName(true);
const log = consola.withTag(scriptName);

// Every tool in `apps/` versions, tags, and changelogs on its own. The tag is
// `<tool>@<version>`, which `.github/workflows/release.yaml` splits back apart
// to find the package to publish.

const CHANGELOG_MD = "CHANGELOG.md";
const TOOL_NAME_REGEXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VERSION_REGEXP = /^v?\d+\.\d+\.\d+(?:-[\d.a-z-]+)?(?:\+[\d.a-z-]+)?$/iu;
const RELEASE_TYPES: ReadonlySet<string> = new Set([
	"conventional",
	"conventional-prerelease",
	"major",
	"minor",
	"next",
	"patch",
	"premajor",
	"preminor",
	"prepatch",
	"prerelease",
	"prompt",
]);

const isManifest = type({ name: "string", "+": "ignore" });
const parseJson = type("string.json.parse");

function createChangelogHeader(packageName: string): string {
	return `# Changelog\n\nAll notable changes to \`${packageName}\` are documented here.`;
}

/**
 * Creates the tool's changelog on its first release and makes sure it has an
 * `## [Unreleased]` section for the release workflow to fill in.
 *
 * @param changelogPath - Absolute path to the tool's `CHANGELOG.md`.
 * @param packageName - The npm name the changelog describes.
 */
async function ensureUnreleasedAsync(changelogPath: string, packageName: string): Promise<void> {
	const header = createChangelogHeader(packageName);
	const content = existsSync(changelogPath) ? await readFile(changelogPath, "utf8") : `${header}\n`;
	if (content.includes("## [Unreleased]")) return;

	const updated = content.includes(header)
		? content.replace(header, () => `${header}\n\n## [Unreleased]`)
		: `${header}\n\n## [Unreleased]\n\n${content}`;
	await writeFile(changelogPath, updated, "utf8");
	log.info(`Inserted ## [Unreleased] into ${nodePath.relative(cwd(), changelogPath)}`);
}

function isVersionBumpRelease(value: string): value is VersionBumpRelease {
	return RELEASE_TYPES.has(value) || VERSION_REGEXP.test(value);
}

async function runNodeAsync(rootDirectory: string, parameters: ReadonlyArray<string>): Promise<void> {
	await exec(execPath, parameters, { nodeOptions: { cwd: rootDirectory, stdio: "inherit" }, throwOnError: true });
}

/**
 * Runs after bumpp writes the new version and before it commits: builds the
 * tool and stages its changelog.
 *
 * @param rootDirectory - The repository root.
 * @param packageName - The tool's npm name, used as the turbo filter.
 * @param changelogPath - Absolute path to the tool's `CHANGELOG.md`.
 */
async function prepareReleaseAsync(rootDirectory: string, packageName: string, changelogPath: string): Promise<void> {
	await runNodeAsync(rootDirectory, ["--run", "turbo", "--", "run", "build", `--filter=${packageName}`]);
	await ensureUnreleasedAsync(changelogPath, packageName);
	// `all` only stages tracked files, and a first release creates the
	// changelog.
	await exec("git", ["add", changelogPath], { throwOnError: true });
}

const command = createBaseCommand(scriptName, "1.0.0", "Releases one tool from apps/ with bumpp.")
	.arguments("<tool:string> [release:string]")
	.option("-y, --yes", "Skip the confirmation prompt.")
	.action(async ({ yes }, tool, release) => {
		if (!TOOL_NAME_REGEXP.test(tool)) {
			log.fail(`"${tool}" is not a tool name; pass the directory name under apps/.`);
			exit(1);
		}

		const rootDirectory = cwd();
		const toolDirectory = nodePath.join(rootDirectory, "apps", tool);
		const manifestPath = nodePath.join(toolDirectory, "package.json");
		if (!existsSync(manifestPath)) {
			log.fail(`apps/${tool}/package.json does not exist.`);
			exit(1);
		}

		if (release !== undefined && !isVersionBumpRelease(release)) {
			log.fail(`"${release}" is not a release type or version, like patch, minor, major, or 1.2.3.`);
			exit(1);
		}

		const { name } = isManifest.assert(parseJson.assert(await readFile(manifestPath, "utf8")));
		const changelogPath = nodePath.join(toolDirectory, CHANGELOG_MD);

		const overrides: Partial<VersionBumpOptions> = {
			commit: `chore(release): ${tool}@%s`,
			cwd: toolDirectory,
			execute: async (): Promise<void> => prepareReleaseAsync(rootDirectory, name, changelogPath),
			files: ["package.json"],
			tag: `${tool}@%s`,
		};
		if (yes) overrides.confirm = false;
		if (release !== undefined) overrides.release = release;

		const configuration = await loadBumpConfig(overrides, rootDirectory);

		await versionBump(configuration);
	});

await command.parse(argv.slice(2));
