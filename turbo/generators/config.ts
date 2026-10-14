import { existsSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { cwd, execPath } from "node:process";
import { type } from "arktype";
import { Predicate } from "effect";
import { exec } from "tinyexec";

import type { PlopTypes } from "@turbo/gen";

const PACKAGE_JSON = "package.json";
const PACKAGE_NAME_REGEXP = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SCOPE_REGEXP = /^@[a-z0-9][a-z0-9-]*$/u;

const isGeneratorAnswers = type({
	name: "string",
	"+": "ignore",
	description: "string",
	"runtime?": "'bun' | 'node'",
	scope: "string",
	"turbo?": { "paths?": { "root?": "unknown" } },
});

type GeneratorAnswers = typeof isGeneratorAnswers.infer;
type Runtime = NonNullable<GeneratorAnswers["runtime"]>;

/** Libraries live in `packages/`; runnable CLIs live in `apps/`. */
type WorkspaceDirectory = "apps" | "packages";

function validateName(input: string): boolean | string {
	return PACKAGE_NAME_REGEXP.test(input) || "Use kebab-case, like my-package.";
}

function validateDescription(input: string): boolean | string {
	return input.trim().length > 0 || "Describe the package in one line.";
}

function validateScope(input: string): boolean | string {
	return SCOPE_REGEXP.test(input) || "Use an npm scope, like @howmanysmall.";
}

function readRoot(answers: GeneratorAnswers): string {
	const root = answers.turbo?.paths?.root;
	return Predicate.isString(root) && root.length > 0 ? root : cwd();
}

function createPrompts(directory: WorkspaceDirectory, defaultScope: string): Array<PlopTypes.PromptQuestion> {
	return [
		{
			name: "name",
			message: `Package name? This becomes ${directory}/<name>.`,
			type: "input",
			validate: validateName,
		},
		{
			name: "description",
			message: "One-line package description?",
			type: "input",
			validate: validateDescription,
		},
		{
			name: "scope",
			default: defaultScope,
			message: "npm scope?",
			type: "input",
			validate: validateScope,
		},
	];
}

function createEnsureDirectoryAvailable(directory: WorkspaceDirectory): PlopTypes.CustomActionFunction {
	return function ensureDirectoryAvailable(answers) {
		const validAnswers = isGeneratorAnswers.assert(answers);
		if (!PACKAGE_NAME_REGEXP.test(validAnswers.name)) {
			throw new Error(`Invalid package name "${validAnswers.name}": use kebab-case.`);
		}

		if (existsSync(nodePath.join(readRoot(validAnswers), directory, validAnswers.name))) {
			throw new Error(`${directory}/${validAnswers.name} already exists.`);
		}

		return `${directory}/${validAnswers.name} is available.`;
	};
}

function createSyncTsconfigReferencesAsync(directory: WorkspaceDirectory): PlopTypes.CustomActionFunction {
	return async function syncTsconfigReferencesAsync(answers) {
		const validAnswers = isGeneratorAnswers.assert(answers);
		await exec(execPath, ["scripts/sync-tsconfig-references.ts"], {
			nodeOptions: {
				cwd: readRoot(validAnswers),
			},
		});
		return `Synced tsconfig references. Next: pnpm install, then build on ${directory}/${validAnswers.name}.`;
	};
}

function createAddAction(directory: WorkspaceDirectory, template: string, target: string): PlopTypes.AddActionConfig {
	return {
		path: `${directory}/{{kebabCase name}}/${target}`,
		templateFile: `templates/${template}.hbs`,
		type: "add",
	};
}

function stringifyJson(value: string): string {
	return JSON.stringify(value);
}

function renderShebang(runtime: Runtime): string {
	return runtime === "bun" ? "#!/usr/bin/env bun" : "#!/usr/bin/env node";
}

function renderRuntimeName(runtime: Runtime): string {
	return runtime === "bun" ? "Bun" : "Node";
}

const isRootManifest = type({ "+": "ignore", repository: { "+": "ignore", url: "string" } });

/**
 * Reads the repository URL from the root `package.json`, so generated packages
 * point at the same repository.
 *
 * @returns The root manifest's `repository.url`.
 */
function renderRepositoryUrl(): string {
	const manifestPath = nodePath.join(cwd(), PACKAGE_JSON);
	const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
	return isRootManifest.assert(manifest).repository.url;
}

/** The two CLI shapes differ only in their manifest, build, and README. */
type CliKind = "cli" | "configurable-cli";

const CLI_PROMPTS: Array<PlopTypes.PromptQuestion> = [
	...createPrompts("apps", "@pobammer-ts"),
	{
		name: "runtime",
		choices: ["bun", "node"],
		default: "bun",
		message: "Which runtime runs the built CLI? Either way, the code only uses Node APIs.",
		type: "list",
	},
];

function createCliActions(kind: CliKind): Array<PlopTypes.ActionType> {
	return [
		createEnsureDirectoryAvailable("apps"),
		createAddAction("apps", `${kind}/package`, PACKAGE_JSON),
		createAddAction("apps", `${kind}/readme`, "README.md"),
		createAddAction("apps", `${kind}/tsdown-config`, "tsdown.config.ts"),
		createAddAction("apps", "cli/tsconfig", "tsconfig.json"),
		createAddAction("apps", "cli/tsconfig-lib", "tsconfig.lib.json"),
		createAddAction("apps", "cli/vitest-config", "vitest.config.ts"),
		createAddAction("apps", "cli/src-cli", "src/cli.ts"),
		createAddAction("apps", "cli/src-constants", "src/constants.ts"),
		createAddAction("apps", "cli/src-constants-test", "src/constants.test.ts"),
	];
}

/**
 * Scaffolds new workspace packages: private libraries in `packages/`, shaped
 * like cli-utilities, and CLIs in `apps/`, either plain or configurable.
 *
 * @param plop - The generator API Turborepo provides.
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
	plop.setHelper("json", stringifyJson);
	plop.setHelper("shebang", renderShebang);
	plop.setHelper("repositoryUrl", renderRepositoryUrl);
	plop.setHelper("runtimeName", renderRuntimeName);
	plop.setGenerator("package", {
		actions: [
			createEnsureDirectoryAvailable("packages"),
			createAddAction("packages", "package/package", PACKAGE_JSON),
			createAddAction("packages", "package/readme", "README.md"),
			createAddAction("packages", "package/tsconfig", "tsconfig.json"),
			createAddAction("packages", "package/vitest-config", "vitest.config.ts"),
			createAddAction("packages", "package/src-index", "src/index.ts"),
			createAddAction("packages", "package/src-index-test", "src/index.test.ts"),
			createSyncTsconfigReferencesAsync("packages"),
		],
		description: "A private library package, like packages/cli-utilities.",
		prompts: createPrompts("packages", "@howmanysmall"),
	});

	plop.setGenerator("cli", {
		actions: [...createCliActions("cli"), createSyncTsconfigReferencesAsync("apps")],
		description: "A CLI in apps/ that ships only an executable.",
		prompts: CLI_PROMPTS,
	});

	plop.setGenerator("configurable-cli", {
		actions: [
			...createCliActions("configurable-cli"),
			createAddAction("apps", "configurable-cli/src-index", "src/index.ts"),
			createAddAction("apps", "configurable-cli/src-index-test", "src/index.test.ts"),
			createSyncTsconfigReferencesAsync("apps"),
		],
		description: "A CLI in apps/ that also exports defineConfiguration for configuration files.",
		prompts: CLI_PROMPTS,
	});
}
