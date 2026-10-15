import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { loadReferenceAsync, toDataUrl } from "./references.ts";

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function createDirectoryAsync(): Promise<string> {
	return mkdtemp(nodePath.join(tmpdir(), "darkroom-references-"));
}

describe("loadReferenceAsync", () => {
	it("loads a local image and detects its type from the bytes", async ({ expect }) => {
		expect.assertions(2);

		const path = nodePath.join(await createDirectoryAsync(), "sky.png");
		await writeFile(path, PNG_BYTES);
		const reference = await loadReferenceAsync(path);

		expect(reference.mediaType).toBe("image/png");
		expect(toDataUrl(reference)).toBe(`data:image/png;base64,${Buffer.from(PNG_BYTES).toString("base64")}`);
	});

	it("rejects missing files, wrong extensions, and files that are not images", async ({ expect }) => {
		expect.assertions(3);

		const directory = await createDirectoryAsync();
		const fake = nodePath.join(directory, "fake.png");
		await writeFile(fake, "not an image");

		await expect(loadReferenceAsync(nodePath.join(directory, "missing.png"))).rejects.toThrow("not found");
		await expect(loadReferenceAsync(nodePath.join(directory, "notes.txt"))).rejects.toThrow("must be a .png");
		await expect(loadReferenceAsync(fake)).rejects.toThrow("is not a PNG, JPEG, WebP, or GIF image");
	});

	it("downloads URLs and checks the response", async ({ expect }) => {
		expect.assertions(2);

		const fetchImageAsync: typeof fetch = async () => new Response(PNG_BYTES);
		const fetchMissingAsync: typeof fetch = async () => new Response("gone", { status: 404 });

		await expect(loadReferenceAsync("https://example.com/a.png", fetchImageAsync)).resolves.toMatchObject({
			mediaType: "image/png",
			source: "https://example.com/a.png",
		});
		await expect(loadReferenceAsync("https://example.com/b.png", fetchMissingAsync)).rejects.toThrow("HTTP 404");
	});
});
