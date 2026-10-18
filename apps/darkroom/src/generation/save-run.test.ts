import { chmod, mkdir, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { createHistoryStore, getRunDirectory, readAllAsync, resolve } from "$history/history-store";

import { MULTI_MODEL } from "./model-fixture";
import { prepareGenerationAsync } from "./run-generation";
import { saveRunAsync } from "./save-run";

import type { GenerationInput, PreparedGeneration } from "./run-generation";

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const RUN_ID = "01M4YVAKWVPWQQRBEKXDKQYBW1";

async function createDirectoryAsync(): Promise<string> {
	return mkdtemp(nodePath.join(tmpdir(), "darkroom-save-"));
}

async function prepareAsync(cwd: string, input: Partial<GenerationInput>): Promise<PreparedGeneration> {
	return prepareGenerationAsync(
		{ force: false, modelId: MULTI_MODEL.id, options: {}, prompt: "a cat", references: [], ...input },
		{ cwd, isDirectoryAsync: async () => false, models: [MULTI_MODEL], stdoutIsTty: false },
	);
}

describe("saveRunAsync", () => {
	it("records the run in the history with copies of images and references", async ({ expect }) => {
		expect.assertions(3);

		const cwd = await createDirectoryAsync();
		const history = createHistoryStore(await createDirectoryAsync());
		const prepared = await prepareAsync(cwd, {
			parent: "01M4YVAAAAAAAAAAAAAAAAAAA1",
			references: [{ bytes: PNG_BYTES, mediaType: "image/png", source: "~/sky.png" }],
		});

		await saveRunAsync(
			{
				id: RUN_ID,
				cost: 0.04,
				createdAt: new Date(2026, 9, 14),
				images: [{ b64Json: "iVBORw0KGgoB" }],
				prepared,
			},
			{ history, warn: () => undefined, writeStdoutAsync: async () => undefined },
		);
		const [entry] = await readAllAsync(history, () => undefined);

		expect(entry).toMatchObject({
			id: RUN_ID,
			cost: 0.04,
			parent: "01M4YVAAAAAAAAAAAAAAAAAAA1",
			references: [{ source: "~/sky.png", stored: `images/${RUN_ID}/refs/1.png` }],
			// oxlint-disable-next-line id-length -- the API calls this field n
			request: { n: 1 },
		});
		expect(entry?.images).toStrictEqual([
			{
				mediaType: "image/png",
				output: nodePath.join(cwd, "2026-10-14_a-cat_1.png"),
				stored: `images/${RUN_ID}/1.png`,
			},
		]);
		await expect(readdir(getRunDirectory(history, RUN_ID))).resolves.toStrictEqual(["1.png", "refs"]);
	});

	it("points to the history copy when the image can't be written where asked", async ({ expect }) => {
		expect.assertions(2);

		const cwd = await createDirectoryAsync();
		const locked = nodePath.join(cwd, "locked");
		await mkdir(locked);
		await chmod(locked, 0o500);
		const history = createHistoryStore(await createDirectoryAsync());
		const prepared = await prepareAsync(cwd, { options: { output: "locked/cat.png" } });

		const outcome = await saveRunAsync(
			{ id: RUN_ID, createdAt: new Date(), images: [{ b64Json: "iVBORw0KGgoB" }], prepared },
			{ history, warn: () => undefined, writeStdoutAsync: async () => undefined },
		);

		expect(outcome.failures).toHaveLength(1);
		expect(outcome.failures[0]?.recoveredPath).toBe(resolve(history, `images/${RUN_ID}/1.png`));
	});
});
