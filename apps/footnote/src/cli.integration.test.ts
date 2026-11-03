import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { env } from "node:process";
import { describe, it } from "vitest";
import { type } from "arktype";
import { parse as parseJsonc } from "jsonc-parser";

import type { TestContext } from "vitest";

const CLI_PATH = nodePath.join(import.meta.dirname, "cli.ts");
const SYNC_MESSAGE = "all tsconfig references are in sync";
const WORKSPACE_YAML = 'packages:\n  - "apps/*"\n  - "packages/*"\n';

// Undeclared keys stay in the result, so `toStrictEqual` still sees them.
const isWrittenTsconfig = type({
	"compilerOptions?": { "composite?": "boolean" },
	"include?": "string[]",
	"references?": type({ path: "string", "prepend?": "boolean" }).array(),
}).readonly();

interface CliResult {
	readonly exitCode: null | number;
	readonly stderr: string;
	readonly stdout: string;
}

function createDirectory(onTestFinished: TestContext["onTestFinished"]): string {
	const root = mkdtempSync(nodePath.join(tmpdir(), "footnote-cli-"));
	onTestFinished(() => {
		rmSync(root, { force: true, recursive: true });
	});
	return root;
}

function writeTree(root: string, tree: Readonly<Record<string, string>>): void {
	for (const [file, content] of Object.entries(tree)) {
		const path = nodePath.join(root, file);
		mkdirSync(nodePath.dirname(path), { recursive: true });
		writeFileSync(path, content);
	}
}

function createWorkspace(
	onTestFinished: TestContext["onTestFinished"],
	tree: Readonly<Record<string, string>>,
): string {
	const root = createDirectory(onTestFinished);
	writeTree(root, { "pnpm-workspace.yaml": WORKSPACE_YAML, ...tree });
	return root;
}

function createManifest(name: string, ...workspaceDependencies: ReadonlyArray<string>): string {
	const dependencies = Object.fromEntries(workspaceDependencies.map((dependency) => [dependency, "workspace:*"]));
	return JSON.stringify({ name, dependencies });
}

function createTsconfig(...paths: ReadonlyArray<string>): string {
	return JSON.stringify({ references: paths.map((path) => ({ path })) });
}

function runCli(cwd: string, ...parameters: ReadonlyArray<string>): CliResult {
	const { status, stderr, stdout } = spawnSync("bun", ["run", CLI_PATH, ...parameters], {
		cwd,
		encoding: "utf8",
		env: { ...env, NO_COLOR: "1" },
	});

	return { exitCode: status, stderr, stdout };
}

function read(root: string, file: string): string {
	return readFileSync(nodePath.join(root, file), "utf8");
}

function readTsconfig(root: string, file: string): typeof isWrittenTsconfig.infer {
	const data: unknown = parseJsonc(read(root, file), undefined, { allowTrailingComma: true });
	return isWrittenTsconfig.assert(data);
}

function findWorkspaceAncestor(directory: string): string | undefined {
	const parent = nodePath.dirname(directory);

	if (existsSync(nodePath.join(directory, "pnpm-workspace.yaml"))) return directory;
	return parent === directory ? undefined : findWorkspaceAncestor(parent);
}

const STALE_ROOT = {
	"apps/a/package.json": createManifest("a"),
	"apps/a/tsconfig.json": "{}\n",
	"tsconfig.json": "{}\n",
};

describe("syncing", () => {
	// Catches a reported sync that was not written, or misnamed changes.
	it("fixes a stale workspace and lists what it changed", ({ expect, onTestFinished }) => {
		expect.assertions(6);

		const root = createWorkspace(onTestFinished, {
			"apps/a/package.json": createManifest("a", "b"),
			"apps/a/tsconfig.json": createTsconfig("../../packages/gone"),
			"packages/b/package.json": createManifest("b"),
			"packages/b/tsconfig.json": "{}\n",
			"tsconfig.json": "{}\n",
		});

		const { exitCode, stderr, stdout } = runCli(root);

		expect(exitCode).toBe(0);
		expect(stdout).toBe(
			[
				"apps/a/tsconfig.json",
				"  + ../../packages/b",
				"  - ../../packages/gone",
				"tsconfig.json",
				"  + ./apps/a",
				"  + ./packages/b",
				"",
			].join("\n"),
		);
		expect(stderr).toContain("synced 2 file(s)");
		expect(readTsconfig(root, "apps/a/tsconfig.json").references).toStrictEqual([{ path: "../../packages/b" }]);
		expect(readTsconfig(root, "tsconfig.json").references).toStrictEqual([
			{ path: "./apps/a" },
			{ path: "./packages/b" },
		]);
		expect(readTsconfig(root, "packages/b/tsconfig.json")).toStrictEqual({});
	});

	// Catches a sync that keeps reformatting files, or one that never settles.
	it("changes no bytes on a second run", ({ expect, onTestFinished }) => {
		expect.assertions(5);

		const root = createWorkspace(onTestFinished, {
			"apps/a/package.json": createManifest("a", "b"),
			"apps/a/tsconfig.json": "{}\n",
			"packages/b/package.json": createManifest("b"),
			"packages/b/tsconfig.json": "{}\n",
			"tsconfig.json": "{}\n",
		});

		expect(runCli(root).exitCode).toBe(0);

		const before = [read(root, "apps/a/tsconfig.json"), read(root, "tsconfig.json")];

		const { exitCode, stderr, stdout } = runCli(root);

		expect(exitCode).toBe(0);
		expect(stdout).toBe("");
		expect(stderr).toContain(SYNC_MESSAGE);
		expect([read(root, "apps/a/tsconfig.json"), read(root, "tsconfig.json")]).toStrictEqual(before);
	});

	// Catches a hand-written reference losing options in the rewrite.
	it("keeps a hand-written reference's prepend while removing a stale one", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, {
			"apps/a/package.json": createManifest("a"),
			"apps/a/tsconfig.json": JSON.stringify({
				references: [{ path: "../../handwritten/lib", prepend: true }, { path: "../../packages/gone" }],
			}),
		});

		expect(runCli(root).exitCode).toBe(0);
		expect(readTsconfig(root, "apps/a/tsconfig.json").references).toStrictEqual([
			{ path: "../../handwritten/lib", prepend: true },
		]);
	});

	// Catches an empty `references` array left in a dependency-free project.
	it("removes the references key when the final list is empty", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, {
			"apps/a/package.json": createManifest("a"),
			"apps/a/tsconfig.json": JSON.stringify({
				compilerOptions: { composite: true },
				references: [{ path: "../../packages/gone" }],
			}),
		});

		expect(runCli(root).exitCode).toBe(0);
		expect(readTsconfig(root, "apps/a/tsconfig.json")).toStrictEqual({ compilerOptions: { composite: true } });
	});

	// Catches a sync that cannot find the root or fixes only the local file.
	it("works from a subdirectory of the workspace", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(onTestFinished, { ...STALE_ROOT, "apps/a/src/.gitkeep": "" });

		const { exitCode, stdout } = runCli(nodePath.join(root, "apps/a/src"));

		expect(exitCode).toBe(0);
		expect(stdout).toBe("tsconfig.json\n  + ./apps/a\n");
		expect(readTsconfig(root, "tsconfig.json").references).toStrictEqual([{ path: "./apps/a" }]);
	});

	// Catches the configured `ignore` applying to no part of the command.
	it("leaves a project ignored in .config/footnote.json out of the root", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, {
			...STALE_ROOT,
			".config/footnote.json": JSON.stringify({ ignore: ["apps/hidden"] }),
			"apps/hidden/package.json": createManifest("hidden"),
			"apps/hidden/tsconfig.json": "{}\n",
		});

		expect(runCli(root).exitCode).toBe(0);
		expect(readTsconfig(root, "tsconfig.json").references).toStrictEqual([{ path: "./apps/a" }]);
	});

	// Catches a workspace with nothing to manage being reported as an error.
	it.for([
		{ label: "no matching directories", yaml: WORKSPACE_YAML },
		{ label: "an empty packages list", yaml: "packages: []\n" },
		{ label: "no packages key", yaml: "" },
	])("exits 0 for a workspace with $label", ({ yaml }, { expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, { "pnpm-workspace.yaml": yaml });

		const { exitCode, stderr } = runCli(root);

		expect(exitCode).toBe(0);
		expect(stderr).toContain(SYNC_MESSAGE);
	});
});

describe("--check", () => {
	// Catches CI passing on drift, or the check fixing the drift it reports.
	it("exits 1 on drift, reports it, and writes nothing", ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const root = createWorkspace(onTestFinished, STALE_ROOT);

		const { exitCode, stderr, stdout } = runCli(root, "--check");

		expect(exitCode).toBe(1);
		expect(stdout).toBe("tsconfig.json\n  + ./apps/a\n");
		expect(stderr).toContain("out of sync");
		expect(read(root, "tsconfig.json")).toBe("{}\n");
	});

	// Catches CI failing on a workspace with nothing wrong.
	it("exits 0 when the workspace is in sync", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(onTestFinished, {
			"apps/a/package.json": createManifest("a"),
			"apps/a/tsconfig.json": "{}\n",
			"tsconfig.json": createTsconfig("./apps/a"),
		});

		const { exitCode, stderr, stdout } = runCli(root, "--check");

		expect(exitCode).toBe(0);
		expect(stdout).toBe("");
		expect(stderr).toContain(SYNC_MESSAGE);
	});
});

describe("tsconfig files with comments", () => {
	const COMMENTED_TSCONFIG = `{
	// line comment to keep
	"compilerOptions": {
		/* block comment to keep */
		"composite": true,
	},
	"include": ["src"],
}
`;

	// Catches a real-world tsconfig being rejected because it is not strict JSON.
	it("--check reads comments and trailing commas without failing on them", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, { ...STALE_ROOT, "tsconfig.json": COMMENTED_TSCONFIG });

		const { exitCode, stdout } = runCli(root, "--check");

		expect(exitCode).toBe(1);
		expect(stdout).toBe("tsconfig.json\n  + ./apps/a\n");
	});

	// Catches a sync flattening a hand-maintained tsconfig to plain JSON.
	it("sync keeps comments and unrelated keys", ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const root = createWorkspace(onTestFinished, { ...STALE_ROOT, "tsconfig.json": COMMENTED_TSCONFIG });

		expect(runCli(root).exitCode).toBe(0);

		const text = read(root, "tsconfig.json");

		expect(text).toContain("// line comment to keep");
		expect(text).toContain("/* block comment to keep */");
		expect(readTsconfig(root, "tsconfig.json")).toStrictEqual({
			compilerOptions: { composite: true },
			include: ["src"],
			references: [{ path: "./apps/a" }],
		});
	});
});

describe("failures", () => {
	// Catches the command silently syncing against the wrong directory.
	it("exits 1 naming pnpm-workspace.yaml when no ancestor has one", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const directory = createDirectory(onTestFinished);

		// Guards the test: an ancestor's file would make it sync that instead.
		expect(findWorkspaceAncestor(directory)).toBeUndefined();

		const { exitCode, stderr } = runCli(directory);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("pnpm-workspace.yaml");
	});

	// Catches a half-applied sync, where one bad file leaves others rewritten.
	it("exits 1 naming a malformed tsconfig and writes no other file", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(onTestFinished, {
			...STALE_ROOT,
			"packages/broken/package.json": createManifest("broken"),
			"packages/broken/tsconfig.json": '{ "references": [',
		});

		const { exitCode, stderr } = runCli(root);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("packages/broken/tsconfig.json");
		expect(read(root, "tsconfig.json")).toBe("{}\n");
	});

	// Catches a typo in `--config` silently running with defaults.
	it("exits 3 when the --config file does not exist", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, STALE_ROOT);

		expect(runCli(root, "--config", "missing.json").exitCode).toBe(3);
		expect(read(root, "tsconfig.json")).toBe("{}\n");
	});

	// Catches a bad setting being ignored, syncing what the user meant to skip.
	it("exits 3 when the configuration has an invalid value", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, {
			...STALE_ROOT,
			".config/footnote.json": JSON.stringify({ ignore: "apps/*" }),
		});

		expect(runCli(root).exitCode).toBe(3);
		expect(read(root, "tsconfig.json")).toBe("{}\n");
	});

	// Catches a dropped unknown flag: a mistyped `--check` would write files.
	it("exits 2 on an unknown flag", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, STALE_ROOT);

		expect(runCli(root, "--json").exitCode).toBe(2);
		expect(read(root, "tsconfig.json")).toBe("{}\n");
	});
});
