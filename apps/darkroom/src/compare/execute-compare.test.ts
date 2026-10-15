import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { InterruptGuard } from "$generation/interrupt-guard";
import { MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";
import { prepareGenerationAsync } from "$generation/run-generation";
import { HistoryStore } from "$history/history-store";

import { getModelFileStem } from "./compare-plan.ts";
import { executeCompareAsync } from "./execute-compare.ts";

import type { ImageGenerationRequest } from "@openrouter/sdk/models";
import type { CreateImagesResponse } from "@openrouter/sdk/models/operations";

import type { ImagesClient, PreparedGeneration } from "$generation/run-generation";

const PNG_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7]).toString("base64");
const BATCH = "01M4YVBATCHAAAAAAAAAAAAAAA";

/** Answers with one image, except for the single-image model, which refuses. */
const CLIENT: ImagesClient = {
	// oxlint-disable-next-line small-rules/require-async-suffix -- implements the SDK method name
	async generate({
		imageGenerationRequest,
	}: {
		imageGenerationRequest: ImageGenerationRequest;
	}): Promise<CreateImagesResponse> {
		if (imageGenerationRequest.model === SINGLE_MODEL.id) throw new Error("The model refused the prompt.");

		return {
			created: 0,
			data: [{ b64Json: PNG_BASE64, mediaType: "image/png" }],
			usage: { completionTokens: 0, cost: 0.007, promptTokens: 0, totalTokens: 0 },
		};
	},
};

async function prepareAsync(modelId: string, directory: string): Promise<PreparedGeneration> {
	return prepareGenerationAsync(
		{
			batch: BATCH,
			force: false,
			modelId,
			options: { output: `${directory}${nodePath.sep}` },
			outputStem: getModelFileStem(modelId),
			prompt: "a cat in a hat",
			references: [],
		},
		{
			cwd: directory,
			isDirectoryAsync: async () => false,
			models: [MULTI_MODEL, SINGLE_MODEL],
			stdoutIsTty: false,
		},
	);
}

describe("executeCompareAsync", () => {
	it("keeps one model's images when another fails, named after the model and tagged with the batch", async ({
		expect,
	}) => {
		expect.assertions(4);

		const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom-compare-"));
		const historyRoot = await mkdtemp(nodePath.join(tmpdir(), "darkroom-compare-history-"));
		const history = new HistoryStore(historyRoot);
		const prepared = await Promise.all([
			prepareAsync(SINGLE_MODEL.id, directory),
			prepareAsync(MULTI_MODEL.id, directory),
		]);
		const lines: Array<string> = [];

		const outcomes = await executeCompareAsync(
			prepared.map((item) => ({ guard: new InterruptGuard(), prepared: item })),
			{
				client: CLIENT,
				history,
				now: () => new Date(2026, 9, 15, 12),
				report(line) {
					lines.push(line);
				},
				warn: () => undefined,
			},
		);
		const entries = await history.readAllAsync(() => undefined);

		expect(outcomes.map(({ model, status }) => [model, status])).toStrictEqual([
			[SINGLE_MODEL.id, "failed"],
			[MULTI_MODEL.id, "ok"],
		]);
		await expect(readdir(directory)).resolves.toStrictEqual([`${getModelFileStem(MULTI_MODEL.id)}_1.png`]);
		expect(entries.map(({ batch, model }) => ({ batch, model }))).toStrictEqual([
			{ batch: BATCH, model: MULTI_MODEL.id },
		]);
		expect(lines).toHaveLength(2);
	});
});
