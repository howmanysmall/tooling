import { mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";
import { HTTPClient, OpenRouter } from "@openrouter/sdk";

import { CHARGE_NOTE } from "$errors/to-api-error";

import { InterruptGuard } from "./interrupt-guard.ts";
import { MULTI_MODEL } from "./model-fixture.ts";
import { executeGenerationAsync, prepareGenerationAsync, requestImagesAsync } from "./run-generation.ts";

import type { CreateImagesResponse } from "@openrouter/sdk/models/operations";

import type { GenerationInput, ImagesClient } from "./run-generation.ts";

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7, 7]);
const PNG_BASE64 = Buffer.from(PNG_BYTES).toString("base64");
const FAKE_KEY = `sk-or-v1-${"a".repeat(64)}`;
// 2026-10-14T12:00:00 in local time, so the date part of names is stable.
const NOW = new Date(2026, 9, 14, 12);

function createClient(imageCount: number, cost?: number): ImagesClient {
	return {
		// oxlint-disable-next-line small-rules/require-async-suffix -- implements the SDK method name
		async generate(): Promise<CreateImagesResponse> {
			return {
				created: 0,
				data: Array.from({ length: imageCount }, () => ({ b64Json: PNG_BASE64, mediaType: "image/png" })),
				usage: { completionTokens: 0, cost, promptTokens: 0, totalTokens: 0 },
			};
		},
	};
}

function createInput(overrides: Partial<GenerationInput["options"]> = {}, force = false): GenerationInput {
	return { force, modelId: MULTI_MODEL.id, options: overrides, prompt: "a cat in a hat", references: [] };
}

async function runAsync(
	cwd: string,
	client: ImagesClient,
	input: GenerationInput,
): Promise<{ result: Awaited<ReturnType<typeof executeGenerationAsync>>; warnings: Array<string> }> {
	const warnings: Array<string> = [];
	const prepared = await prepareGenerationAsync(input, {
		cwd,
		async isDirectoryAsync(path) {
			try {
				const stats = await stat(nodePath.resolve(cwd, path));
				return stats.isDirectory();
			} catch {
				return false;
			}
		},
		models: [MULTI_MODEL],
		stdoutIsTty: false,
	});
	const result = await executeGenerationAsync(prepared, {
		client,
		guard: new InterruptGuard(),
		now: () => NOW,
		warn(message) {
			warnings.push(message);
		},
		async writeStdoutAsync() {
			// Not used by these tests.
		},
	});
	return { result, warnings };
}

async function createDirectoryAsync(): Promise<string> {
	return mkdtemp(nodePath.join(tmpdir(), "darkroom-run-"));
}

describe("executeGenerationAsync", () => {
	it("saves every image under the generated name and reports the cost", async ({ expect }) => {
		expect.assertions(3);

		const cwd = await createDirectoryAsync();
		const { result } = await runAsync(cwd, createClient(2, 0.08), createInput({ count: 2 }));

		expect(result).toMatchObject({ cost: 0.08, requested: 2, returned: 2 });
		await expect(readdir(cwd)).resolves.toStrictEqual([
			"2026-10-14_a-cat-in-a-hat_1.png",
			"2026-10-14_a-cat-in-a-hat_2.png",
		]);
		await expect(readFile(nodePath.join(cwd, "2026-10-14_a-cat-in-a-hat_1.png"))).resolves.toStrictEqual(
			Buffer.from(PNG_BYTES),
		);
	});

	it("keeps partial results and warns about the shortfall", async ({ expect }) => {
		expect.assertions(2);

		const cwd = await createDirectoryAsync();
		const { result, warnings } = await runAsync(cwd, createClient(2), createInput({ count: 4 }));

		expect(result.images).toHaveLength(2);
		expect(warnings).toStrictEqual(["Asked for 4 images, got 2."]);
	});

	it("refuses to overwrite an explicit -o file before spending, unless --force", async ({ expect }) => {
		expect.assertions(2);

		const cwd = await createDirectoryAsync();
		await writeFile(nodePath.join(cwd, "cat.png"), "keep me");

		await expect(runAsync(cwd, createClient(1), createInput({ output: "cat.png" }))).rejects.toThrow(
			"already exists. Pass --force",
		);

		await runAsync(cwd, createClient(1), createInput({ output: "cat.png" }, true));

		await expect(readFile(nodePath.join(cwd, "cat.png"))).resolves.toStrictEqual(Buffer.from(PNG_BYTES));
	});

	it("never overwrites existing files with generated names", async ({ expect }) => {
		expect.assertions(1);

		const cwd = await createDirectoryAsync();
		await writeFile(nodePath.join(cwd, "2026-10-14_a-cat-in-a-hat_1.png"), "older run");
		await runAsync(cwd, createClient(1), createInput());

		await expect(readdir(cwd)).resolves.toStrictEqual([
			"2026-10-14_a-cat-in-a-hat_1-2.png",
			"2026-10-14_a-cat-in-a-hat_1.png",
		]);
	});
});

describe("requestImagesAsync with the real SDK", () => {
	interface FakeSdk {
		readonly attempts: () => number;
		readonly images: OpenRouter["images"];
	}

	function createSdk(respond: () => Promise<Response>): FakeSdk {
		let attempts = 0;
		const httpClient = new HTTPClient({
			async fetcher() {
				attempts += 1;
				return respond();
			},
		});
		return { attempts: () => attempts, images: new OpenRouter({ apiKey: FAKE_KEY, httpClient }).images };
	}

	const request = { model: MULTI_MODEL.id, prompt: "a cat" };

	it("sends exactly one request when the server fails, and says it may have been charged", async ({ expect }) => {
		expect.assertions(2);

		const sdk = createSdk(async () => new Response("upstream exploded", { status: 500 }));

		await expect(requestImagesAsync(sdk.images, request, new AbortController().signal)).rejects.toThrow(
			`OpenRouter returned 500: upstream exploded ${CHARGE_NOTE}`,
		);
		expect(sdk.attempts()).toBe(1);
	});

	it("sends exactly one request when the connection drops", async ({ expect }) => {
		expect.assertions(2);

		const sdk = createSdk(async () => {
			throw new TypeError("fetch failed");
		});

		await expect(requestImagesAsync(sdk.images, request, new AbortController().signal)).rejects.toThrow(
			CHARGE_NOTE,
		);
		expect(sdk.attempts()).toBe(1);
	});

	it("exits 130 when aborted mid-request", async ({ expect }) => {
		expect.assertions(1);

		const controller = new AbortController();
		const sdk = createSdk(
			async () =>
				new Promise<Response>((_resolve, reject) => {
					controller.signal.addEventListener("abort", () => {
						reject(new DOMException("aborted", "AbortError"));
					});
					controller.abort();
				}),
		);

		await expect(requestImagesAsync(sdk.images, request, controller.signal)).rejects.toMatchObject({
			exitCode: 130,
		});
	});
});
