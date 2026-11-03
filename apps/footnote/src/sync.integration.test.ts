import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { stderr, stdout } from "node:process";
import { describe, it, vi } from "vitest";

import { runInitializeAsync } from "./initialize";
import { syncReferencesAsync } from "./sync";

import type { TestContext } from "vitest";

// These run in this process, unlike cli.integration.test.ts, so coverage sees
// the code the subprocess tests exercise.

const COMPOSITE = '{ "compilerOptions": { "composite": true } }\n';
const WORKSPACE_YAML = 'packages:\n  - "apps/*"\n  - "."\n';

function createWorkspace(
	{ onTestFinished }: Pick<TestContext, "onTestFinished">,
	tree: Readonly<Record<string, string>>,
): string {
	const root = mkdtempSync(nodePath.join(tmpdir(), "footnote-sync-"));
	onTestFinished(() => {
		rmSync(root, { force: true, recursive: true });
	});

	const entries = Object.entries({ "pnpm-workspace.yaml": WORKSPACE_YAML, ...tree });
	for (const [file, content] of entries) {
		const path = nodePath.join(root, file);
		mkdirSync(nodePath.dirname(path), { recursive: true });
		writeFileSync(path, content);
	}

	return root;
}

function captureOutput({ onTestFinished }: Pick<TestContext, "onTestFinished">): () => string {
	const stdoutSpy = vi.spyOn(stdout, "write").mockReturnValue(true);
	const stderrSpy = vi.spyOn(stderr, "write").mockReturnValue(true);
	onTestFinished(() => {
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
	});

	return () => [...stdoutSpy.mock.calls, ...stderrSpy.mock.calls].map(([text]) => String(text)).join("");
}

function read(root: string, file: string): string {
	return readFileSync(nodePath.join(root, file), "utf8");
}

// Every dependency group, so a group dropped from the list loses a reference.
const DEPENDENT_WORKSPACE = {
	"apps/alpha/package.json": JSON.stringify({
		name: "alpha",
		dependencies: { bravo: "workspace:*", published: "1.0.0" },
		devDependencies: { charlie: "workspace:^" },
		optionalDependencies: { delta: "workspace:*" },
		peerDependencies: { echo: "workspace:*" },
	}),
	"apps/alpha/tsconfig.json": "{}\n",
	"apps/bravo/package.json": '{ "name": "bravo" }',
	"apps/bravo/tsconfig.json": "{}\n",
	"apps/charlie/package.json": '{ "name": "charlie" }',
	"apps/charlie/tsconfig.json": "{}\n",
	"apps/delta/package.json": '{ "name": "delta" }',
	"apps/delta/tsconfig.json": "{}\n",
	"apps/echo/package.json": '{ "name": "echo" }',
	"apps/echo/tsconfig.json": "{}\n",
	"apps/no-tsconfig/package.json": '{ "name": "no-tsconfig" }',
};

describe("syncReferencesAsync", () => {
	// Catches a dependency group being skipped, a non-workspace dependency
	// getting a reference, or a directory without a tsconfig counting as a
	// project.
	it("references every workspace dependency and exits 0", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		captureOutput({ onTestFinished });
		const root = createWorkspace({ onTestFinished }, DEPENDENT_WORKSPACE);

		await expect(syncReferencesAsync({ cwd: root })).resolves.toBe(0);
		expect(JSON.parse(read(root, "apps/alpha/tsconfig.json"))).toStrictEqual({
			references: [{ path: "../bravo" }, { path: "../charlie" }, { path: "../delta" }, { path: "../echo" }],
		});
	});

	// Catches --check writing, or reporting success when something is stale.
	it("exits 1 and writes nothing with check", async ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const readOutput = captureOutput({ onTestFinished });
		const root = createWorkspace({ onTestFinished }, DEPENDENT_WORKSPACE);

		await expect(syncReferencesAsync({ check: true, cwd: root })).resolves.toBe(1);
		expect(read(root, "apps/alpha/tsconfig.json")).toBe("{}\n");
		expect(readOutput()).toContain("out of sync");
	});

	// Catches a workspace with nothing to do being treated as stale.
	it("exits 0 for a workspace with no packages key", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const readOutput = captureOutput({ onTestFinished });
		const root = createWorkspace({ onTestFinished }, { "pnpm-workspace.yaml": "{}\n" });

		await expect(syncReferencesAsync({ cwd: root })).resolves.toBe(0);
		expect(readOutput()).toContain("in sync");
	});
});

describe("runInitializeAsync", () => {
	// Catches the wrong project being ignored or the file missing its path line.
	it("writes the non-composite projects and reports them", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const readOutput = captureOutput({ onTestFinished });
		const root = createWorkspace(
			{ onTestFinished },
			{
				"apps/composite/package.json": '{ "name": "composite" }',
				"apps/composite/tsconfig.json": COMPOSITE,
				"apps/plain/package.json": '{ "name": "plain" }',
				"apps/plain/tsconfig.json": "{}\n",
			},
		);

		await runInitializeAsync({ cwd: root });

		expect(JSON.parse(read(root, "footnote.config.json"))).toStrictEqual({ ignore: ["apps/plain"] });
		expect(readOutput()).toContain("apps/plain");
	});

	// Catches a hand-written configuration being overwritten without --force.
	it("rejects with an existing configuration", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		captureOutput({ onTestFinished });
		const original = '{ "ignore": ["apps/*"] }\n';
		const root = createWorkspace({ onTestFinished }, { "footnote.config.json": original });

		await expect(runInitializeAsync({ cwd: root })).rejects.toThrow("--force");
		expect(read(root, "footnote.config.json")).toBe(original);
	});

	// Catches --force leaving the other file unmentioned, or removing it.
	it("warns about another configuration with force", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const readOutput = captureOutput({ onTestFinished });
		const other = '{ "ignore": ["apps/*"] }\n';
		const root = createWorkspace({ onTestFinished }, { ".config/footnote.json": other });

		await runInitializeAsync({ cwd: root, force: true });

		expect(readOutput()).toContain("every project has composite: true");
		expect(read(root, ".config/footnote.json")).toBe(other);
	});

	// Catches a preview writing the file.
	it("prints the JSON and writes nothing with dryRun", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const readOutput = captureOutput({ onTestFinished });
		const root = createWorkspace({ onTestFinished }, {});

		await runInitializeAsync({ cwd: root, dryRun: true });

		expect(readOutput()).toBe("{}\n");
		expect(() => read(root, "footnote.config.json")).toThrow("ENOENT");
	});
});
