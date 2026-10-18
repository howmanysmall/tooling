import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { writeFileAtomicAsync, writeFileNoClobberAsync } from "./atomic-write";

async function createDirectoryAsync(): Promise<string> {
	return mkdtemp(nodePath.join(tmpdir(), "darkroom-write-"));
}

describe("writeFileNoClobberAsync", () => {
	it("never overwrites, picking -2, -3, … instead", async ({ expect }) => {
		expect.assertions(4);

		const directory = await createDirectoryAsync();
		const path = nodePath.join(directory, "cat.png");
		await writeFile(path, "original");

		const second = await writeFileNoClobberAsync(path, new TextEncoder().encode("second"));
		const third = await writeFileNoClobberAsync(path, new TextEncoder().encode("third"));

		expect(second).toBe(nodePath.join(directory, "cat-2.png"));
		expect(third).toBe(nodePath.join(directory, "cat-3.png"));
		await expect(readFile(path, "utf8")).resolves.toBe("original");
		await expect(readdir(directory)).resolves.toStrictEqual(["cat-2.png", "cat-3.png", "cat.png"]);
	});
});

describe("writeFileAtomicAsync", () => {
	it("replaces the file and leaves no temporary files behind", async ({ expect }) => {
		expect.assertions(2);

		const directory = await createDirectoryAsync();
		const path = nodePath.join(directory, "cat.png");
		await writeFile(path, "original");
		await writeFileAtomicAsync(path, "replaced");

		await expect(readFile(path, "utf8")).resolves.toBe("replaced");
		await expect(readdir(directory)).resolves.toStrictEqual(["cat.png"]);
	});
});
