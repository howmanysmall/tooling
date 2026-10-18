import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { PassThrough } from "node:stream";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, it } from "vitest";
import ansis from "ansis";

import { pickReferencesAsync } from "./reference-picker";

const UP = "\u001B[A";
const DOWN = "\u001B[B";
const LEFT = "\u001B[D";
const ENTER = "\r";
const ESCAPE = "\u001B";

async function createFolderAsync(): Promise<string> {
	const root = await mkdtemp(nodePath.join(tmpdir(), "darkroom-picker-"));
	await mkdir(nodePath.join(root, "old"));
	await Promise.all([
		writeFile(nodePath.join(root, "sky.png"), ""),
		writeFile(nodePath.join(root, "tree.jpg"), ""),
		writeFile(nodePath.join(root, "old", "boat.webp"), ""),
	]);
	return root;
}

interface Session {
	readonly readScreen: () => string;
	readonly result: Promise<Array<string> | symbol | undefined>;
	readonly typeAsync: (keys: ReadonlyArray<string>) => Promise<void>;
}

function startPicker(directory: string, max: number): Session {
	const input = new PassThrough();
	const output = new PassThrough();
	let written = "";
	output.on("data", (chunk: Buffer) => {
		written += chunk.toString("utf8");
	});
	const result = pickReferencesAsync({ directory, input, max, message: "Reference images", output });
	return {
		readScreen: (): string => ansis.strip(written),
		result,
		async typeAsync(keys): Promise<void> {
			for (const key of keys) {
				input.write(key);
				// oxlint-disable-next-line no-await-in-loop -- one key at a time
				await sleep(5);
			}
		},
	};
}

describe("pickReferencesAsync", () => {
	it("selects files across folders and returns them in the order picked", async ({ expect }) => {
		expect.assertions(2);

		const root = await createFolderAsync();
		const session = startPicker(root, 3);
		// The list is ../, old/, sky.png, tree.jpg. Pick sky, open old/,
		// pick boat, go back up, and finish.
		await session.typeAsync([DOWN, DOWN, " ", UP, "\t", DOWN, " ", LEFT, ENTER]);

		await expect(session.result).resolves.toStrictEqual([
			nodePath.join(root, "sky.png"),
			nodePath.join(root, "old", "boat.webp"),
		]);
		expect(session.readScreen()).toContain("(2/3)");
	});

	it("filters by typed text and warns at the limit", async ({ expect }) => {
		expect.assertions(3);

		const root = await createFolderAsync();
		const session = startPicker(root, 1);
		const backspaces = ["\u007F", "\u007F", "\u007F", "\u007F"];
		await session.typeAsync(["t", "r", "e", "e", DOWN, " "]);
		await session.typeAsync([...backspaces, "s", "k", "y", DOWN, " ", ENTER]);

		await expect(session.result).resolves.toStrictEqual([nodePath.join(root, "tree.jpg")]);
		expect(session.readScreen()).toContain("filter: tree");
		expect(session.readScreen()).toContain("This model takes at most 1 reference image.");
	});

	it("can be canceled", async ({ expect }) => {
		expect.assertions(1);

		const session = startPicker(await createFolderAsync(), 2);
		await session.typeAsync([ESCAPE]);

		await expect(session.result).resolves.toBeTypeOf("symbol");
	});
});
