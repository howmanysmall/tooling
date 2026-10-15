import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";
import sharp from "sharp";

import { ImageProtocol } from "./image-protocol.ts";
import { PreviewCache } from "./preview-cache.ts";

import type { Preview } from "./load-preview.ts";

const BOX = { columns: 40, rows: 10 };

function countLines(preview: Preview): number {
	return preview.kind === "image" ? preview.lines.length : 0;
}

async function createImageAsync(width: number, height: number): Promise<string> {
	const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom-preview-"));
	const path = nodePath.join(directory, "image.webp");
	await sharp({ create: { background: "#3366ff", channels: 3, height, width } })
		.webp()
		.toFile(path);
	return path;
}

describe("previewCache", () => {
	it("sends a kitty image once, draws its placeholders, and frees it on dispose", async ({ expect }) => {
		expect.assertions(4);

		const path = await createImageAsync(200, 100);
		const written: Array<string> = [];
		const cache = new PreviewCache(ImageProtocol.Kitty, (sequence) => {
			written.push(sequence);
		});

		const preview = await cache.getPreview(path, BOX).result;

		expect(cache.getPreview(path, BOX)).toBe(cache.getPreview(path, BOX));
		expect(countLines(preview)).toBe(10);
		expect(written.filter((sequence) => sequence.includes("a=T"))).toHaveLength(1);

		cache.dispose();

		expect(written.at(-1)).toContain("a=d,d=I");
	});

	it("draws half blocks two pixel rows per line", async ({ expect }) => {
		expect.assertions(1);

		const path = await createImageAsync(100, 100);
		const cache = new PreviewCache(ImageProtocol.Blocks, () => undefined);

		const preview = await cache.getPreview(path, BOX).result;

		expect(countLines(preview)).toBe(10);
	});

	it("explains instead of failing when the image is missing", async ({ expect }) => {
		expect.assertions(1);

		const cache = new PreviewCache(ImageProtocol.Blocks, () => undefined);

		await expect(cache.getPreview("/nowhere/image.png", BOX).result).resolves.toMatchObject({ kind: "message" });
	});
});
