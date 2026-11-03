import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { env } from "node:process";
import { describe, it } from "vitest";

import type { TestContext } from "vitest";

const CLI_PATH = nodePath.join(import.meta.dirname, "cli.ts");
const CONFIGURATION_FILE = ".config/footnote.json";
const WORKSPACE_YAML = 'packages:\n  - "apps/*"\n  - "packages/*"\n';

const COMPOSITE = '{ "compilerOptions": { "composite": true } }\n';
const NOT_COMPOSITE = '{ "compilerOptions": { "composite": false } }\n';
const NO_OPTIONS = "{}\n";

/** Workspace-relative paths and the text each one holds. */
type FileTree = Readonly<Record<string, string>>;

interface CliResult {
	readonly exitCode: null | number;
	readonly stderr: string;
	readonly stdout: string;
}

function createDirectory(onTestFinished: TestContext["onTestFinished"]): string {
	// The command prints paths from `cwd()`, which resolves macOS's /var symlink.
	const prefix = nodePath.join(tmpdir(), "footnote-initialize-");
	const root = realpathSync(mkdtempSync(prefix));
	onTestFinished(() => {
		rmSync(root, { force: true, recursive: true });
	});
	return root;
}

function createWorkspace(
	onTestFinished: TestContext["onTestFinished"],
	projects: FileTree,
	files: FileTree = {},
): string {
	const root = createDirectory(onTestFinished);
	const tree = new Map([["pnpm-workspace.yaml", WORKSPACE_YAML], ...Object.entries(files)]);
	for (const [directory, tsconfig] of Object.entries(projects)) {
		tree.set(`${directory}/package.json`, JSON.stringify({ name: nodePath.basename(directory) }));
		tree.set(`${directory}/tsconfig.json`, tsconfig);
	}

	for (const [file, content] of tree) {
		const path = nodePath.join(root, file);
		mkdirSync(nodePath.dirname(path), { recursive: true });
		writeFileSync(path, content);
	}

	return root;
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

function findWorkspaceAncestor(directory: string): string | undefined {
	const parent = nodePath.dirname(directory);

	if (existsSync(nodePath.join(directory, "pnpm-workspace.yaml"))) return directory;
	return parent === directory ? undefined : findWorkspaceAncestor(parent);
}

describe("writing the configuration", () => {
	// Catches a project `tsc --build` rejects being left out of `ignore`, or a
	// valid one being put in it, or anything but the path reaching stdout.
	it("ignores non-composite projects and prints only the path", ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const root = createWorkspace(onTestFinished, {
			"apps/commented": '{\n\t// comment\n\t"compilerOptions": { "composite": true, },\n}\n',
			"apps/composite": COMPOSITE,
			"apps/no-options": NO_OPTIONS,
			"packages/not-composite": NOT_COMPOSITE,
		});

		const { exitCode, stderr, stdout } = runCli(root, "initialize");

		expect(exitCode).toBe(0);
		expect(stdout).toBe(`${nodePath.join(root, CONFIGURATION_FILE)}\n`);
		expect(read(root, CONFIGURATION_FILE)).toBe(
			'{\n\t"ignore": [\n\t\t"apps/no-options",\n\t\t"packages/not-composite"\n\t]\n}\n',
		);
		expect(stderr).toContain("composite: true");
	});

	// Catches an order that depends on the filesystem, which churns the file.
	it("sorts ignore in byte order", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, {
			"apps/alpha": NO_OPTIONS,
			"apps/Zed": NO_OPTIONS,
		});

		expect(runCli(root, "initialize").exitCode).toBe(0);
		expect(JSON.parse(read(root, CONFIGURATION_FILE))).toStrictEqual({ ignore: ["apps/Zed", "apps/alpha"] });
	});

	// Catches `initialize` writing a file the sync rejects or does not honor,
	// which is the reason the command exists.
	it("makes the next check skip non-composite projects and keep composite ones", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(
			onTestFinished,
			{
				"apps/composite": COMPOSITE,
				"apps/plain": NO_OPTIONS,
			},
			{
				"tsconfig.json": "{}\n",
			},
		);

		expect(runCli(root, "initialize").exitCode).toBe(0);

		const { exitCode, stdout } = runCli(root, "--check");

		expect(exitCode).toBe(1);
		expect(stdout).toBe("tsconfig.json\n  + ./apps/composite\n");
	});

	// Catches an empty `ignore` key, or an empty file the loader rejects.
	it("writes an empty object that still loads when every project is composite", ({ expect, onTestFinished }) => {
		expect.assertions(5);

		const root = createWorkspace(onTestFinished, { "apps/composite": COMPOSITE });

		const { exitCode, stderr } = runCli(root, "initialize");

		expect(exitCode).toBe(0);
		expect(read(root, CONFIGURATION_FILE)).toBe("{}\n");
		expect(stderr).toContain("none were ignored");

		const check = runCli(root, "--check");

		expect(check.exitCode).toBe(0);
		expect(check.stderr).toContain("in sync");
	});

	// Catches the alias being lost, leaving the documented short form broken.
	it("runs under the init alias", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, { "apps/plain": NO_OPTIONS });

		expect(runCli(root, "init").exitCode).toBe(0);
		expect(JSON.parse(read(root, CONFIGURATION_FILE))).toStrictEqual({ ignore: ["apps/plain"] });
	});

	// Catches the file landing where the sync would never look for it.
	it("writes at the workspace root from a subdirectory", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(
			onTestFinished,
			{
				"apps/plain": NO_OPTIONS,
			},
			{
				"apps/plain/src/.gitkeep": "",
			},
		);

		const { exitCode, stdout } = runCli(nodePath.join(root, "apps/plain/src"), "initialize");

		expect(exitCode).toBe(0);
		expect(stdout).toBe(`${nodePath.join(root, CONFIGURATION_FILE)}\n`);
		expect(existsSync(nodePath.join(root, "apps/plain/src/.config"))).toBe(false);
	});
});

describe("an existing configuration", () => {
	// Catches a hand-written configuration being clobbered, in any loaded form.
	it.for([
		{ file: CONFIGURATION_FILE, original: '{ "ignore": ["apps/*"] }\n' },
		{ file: "footnote.config.json", original: '{ "ignore": ["apps/*"] }\n' },
		{ file: ".footnoterc", original: "ignore=apps/*\n" },
	])("exits 1 and leaves $file alone", ({ file, original }, { expect, onTestFinished }) => {
		expect.assertions(4);

		const root = createWorkspace(
			onTestFinished,
			{
				"apps/plain": NO_OPTIONS,
			},
			{
				[file]: original,
			},
		);

		const { exitCode, stderr } = runCli(root, "initialize");

		expect(exitCode).toBe(1);
		expect(stderr).toContain(nodePath.join(root, file));
		expect(stderr).toContain("--force");
		expect(read(root, file)).toBe(original);
	});

	// Catches --force refusing, or warning about the file it just replaced.
	it("--force overwrites it without a warning", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(
			onTestFinished,
			{
				"apps/plain": NO_OPTIONS,
			},
			{
				[CONFIGURATION_FILE]: '{ "ignore": ["stale"] }\n',
			},
		);

		const { exitCode, stderr } = runCli(root, "initialize", "--force");

		expect(exitCode).toBe(0);
		expect(JSON.parse(read(root, CONFIGURATION_FILE))).toStrictEqual({ ignore: ["apps/plain"] });
		expect(stderr).not.toContain("warning");
	});

	// Catches a silent conflict, where another file keeps deciding what loads.
	it("--force warns about another configuration file and keeps it", ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const other = '{ "ignore": ["apps/*"] }\n';
		const root = createWorkspace(
			onTestFinished,
			{
				"apps/plain": NO_OPTIONS,
			},
			{
				"footnote.config.json": other,
			},
		);

		const { exitCode, stderr } = runCli(root, "initialize", "--force");

		expect(exitCode).toBe(0);
		expect(stderr).toContain(`warning: ${nodePath.join(root, "footnote.config.json")}`);
		expect(read(root, "footnote.config.json")).toBe(other);
		expect(JSON.parse(read(root, CONFIGURATION_FILE))).toStrictEqual({ ignore: ["apps/plain"] });
	});
});

describe("--dry-run", () => {
	// Catches a preview that writes, or one that differs from the real file.
	it("prints the JSON and creates nothing", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(onTestFinished, { "apps/plain": NO_OPTIONS });

		const { exitCode, stdout } = runCli(root, "initialize", "--dry-run");

		expect(exitCode).toBe(0);
		expect(stdout).toBe('{\n\t"ignore": [\n\t\t"apps/plain"\n\t]\n}\n');
		expect(existsSync(nodePath.join(root, ".config"))).toBe(false);
	});

	// Catches a preview succeeding where the real command would fail.
	it("still fails on an existing configuration without --force", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const original = '{ "ignore": ["apps/*"] }\n';
		const root = createWorkspace(
			onTestFinished,
			{
				"apps/plain": NO_OPTIONS,
			},
			{
				[CONFIGURATION_FILE]: original,
			},
		);

		const { exitCode, stdout } = runCli(root, "initialize", "--dry-run");

		expect(exitCode).toBe(1);
		expect(stdout).toBe("");
		expect(read(root, CONFIGURATION_FILE)).toBe(original);
	});
});

describe("failures", () => {
	// Catches a broken tsconfig being read as non-composite and ignored for good.
	it("exits 1 naming a malformed tsconfig and writes nothing", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const root = createWorkspace(onTestFinished, {
			"apps/plain": NO_OPTIONS,
			"packages/broken": '{ "compilerOptions": {',
		});

		const { exitCode, stderr } = runCli(root, "initialize");

		expect(exitCode).toBe(1);
		expect(stderr).toContain("packages/broken/tsconfig.json");
		expect(existsSync(nodePath.join(root, ".config"))).toBe(false);
	});

	// Catches a configuration being written into a directory no sync would use.
	it("exits 1 naming pnpm-workspace.yaml when no ancestor has one", ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const directory = createDirectory(onTestFinished);

		// Guards the test: an ancestor's file would make it write there instead.
		expect(findWorkspaceAncestor(directory)).toBeUndefined();

		const { exitCode, stderr } = runCli(directory, "initialize");

		expect(exitCode).toBe(1);
		expect(stderr).toContain("pnpm-workspace.yaml");
		expect(existsSync(nodePath.join(directory, ".config"))).toBe(false);
	});

	// Catches a mistyped --dry-run being dropped, which would write the file.
	it("exits 2 on an unknown flag and writes nothing", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const root = createWorkspace(onTestFinished, { "apps/plain": NO_OPTIONS });

		expect(runCli(root, "initialize", "--dryrun").exitCode).toBe(2);
		expect(existsSync(nodePath.join(root, ".config"))).toBe(false);
	});
});
