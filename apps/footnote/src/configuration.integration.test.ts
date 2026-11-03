import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { loadConfigurationAsync } from "./configuration";

import type { TestContext } from "vitest";

function createProject(onTestFinished: TestContext["onTestFinished"]): string {
	const root = mkdtempSync(nodePath.join(tmpdir(), "footnote-configuration-"));
	onTestFinished(() => {
		rmSync(root, { force: true, recursive: true });
	});
	return root;
}

describe("loadConfigurationAsync", () => {
	// Catches a leftover `.footnoterc` quietly changing what gets synced.
	it("does not load a .footnoterc file", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		writeFileSync(nodePath.join(root, ".footnoterc"), "ignore=a\n");

		const { configuration } = await loadConfigurationAsync({ cwd: root, root });

		expect(configuration.ignore).toBeUndefined();
	});

	it("loads a TypeScript configuration file from the workspace root", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		writeFileSync(nodePath.join(root, "footnote.config.ts"), 'export default { ignore: ["a/*"] };\n');

		await expect(loadConfigurationAsync({ cwd: root, root })).resolves.toMatchObject({
			configuration: { ignore: ["a/*"] },
		});
	});

	// This repository keeps its configuration at this path.
	it("loads a JSON configuration file from .config", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		mkdirSync(nodePath.join(root, ".config"));
		writeFileSync(nodePath.join(root, ".config", "footnote.json"), '{ "ignore": ["a/*"] }\n');

		await expect(loadConfigurationAsync({ cwd: root, root })).resolves.toMatchObject({
			configuration: { ignore: ["a/*"] },
		});
	});

	// Catches a package's stray file overriding the workspace's configuration.
	it("searches only the workspace root, not the working directory", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		writeFileSync(nodePath.join(root, "footnote.config.ts"), 'export default { ignore: ["a/*"] };\n');
		const nested = nodePath.join(root, "nested");
		mkdirSync(nested);
		writeFileSync(nodePath.join(nested, "footnote.config.ts"), 'export default { ignore: ["b/*"] };\n');

		await expect(loadConfigurationAsync({ cwd: nested, root })).resolves.toMatchObject({
			configuration: { ignore: ["a/*"] },
		});
	});

	it("runs with an empty configuration when there is no file", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);

		await expect(loadConfigurationAsync({ cwd: root, root })).resolves.toStrictEqual({
			configFile: undefined,
			configuration: {},
		});
	});

	// Catches `--config` resolving from the workspace root.
	it("resolves a --config file from the working directory", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		const nested = nodePath.join(root, "nested");
		mkdirSync(nested);
		writeFileSync(nodePath.join(nested, "custom.json"), '{ "ignore": ["a/*"] }\n');

		await expect(loadConfigurationAsync({ configFile: "custom.json", cwd: nested, root })).resolves.toMatchObject({
			configuration: { ignore: ["a/*"] },
		});
	});

	// Catches a typo in `--config` silently running with defaults.
	it("rejects a --config file that does not exist", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);

		await expect(
			loadConfigurationAsync({ configFile: "missing.config.ts", cwd: root, root }),
		).rejects.toMatchObject({
			exitCode: 3,
		});
	});

	// Catches a misspelled value being ignored instead of reported.
	it("rejects a configuration with a wrongly typed setting", async ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const root = createProject(onTestFinished);
		writeFileSync(nodePath.join(root, "footnote.config.ts"), 'export default { ignore: "a/*" };\n');

		await expect(loadConfigurationAsync({ cwd: root, root })).rejects.toMatchObject({ exitCode: 3 });
	});
});
