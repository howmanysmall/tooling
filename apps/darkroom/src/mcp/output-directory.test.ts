import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { chooseOutputDirectoryAsync } from "./output-directory";

describe(chooseOutputDirectoryAsync, () => {
	// Catches Claude Code's images leaving the project they were made for.
	it("keeps a writable working directory", async ({ expect }) => {
		expect.assertions(1);

		const cwd = await mkdtemp(nodePath.join(tmpdir(), "darkroom-cwd-"));

		await expect(chooseOutputDirectoryAsync(cwd)).resolves.toBe(cwd);
	});

	// Catches Claude Desktop, which starts servers in /, failing every save.
	it("uses ~/Pictures/darkroom when started in the filesystem root", async ({ expect }) => {
		expect.assertions(2);

		const home = await mkdtemp(nodePath.join(tmpdir(), "darkroom-home-"));
		const chosen = await chooseOutputDirectoryAsync(nodePath.parse(home).root, home);

		expect(chosen).toBe(nodePath.join(home, "Pictures", "darkroom"));
		await expect(stat(chosen).then((stats) => stats.isDirectory())).resolves.toBe(true);
	});
});
