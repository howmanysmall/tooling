import { access, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { InMemoryTransport } from "@tmcp/transport-in-memory";
import { type } from "arktype";
import sharp from "sharp";

import { MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";
import { createEntry } from "$history/history-fixture";
import { appendAsync, createHistoryStore } from "$history/history-store";

import { createDarkroomServer } from "./create-server";
import { createPreviewAsync } from "./mcp-dependencies";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { CreateImagesRequest, CreateImagesResponse } from "@openrouter/sdk/models/operations";
import type { Type } from "arktype";
import type { CallToolResult } from "tmcp";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ReferenceImage } from "$generation/references";
import type { ImagesClient } from "$generation/run-generation";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { McpDependencies } from "./mcp-dependencies";

// 2026-10-14T12:00:00 in local time, so the date part of names is stable.
const NOW = new Date(2026, 9, 14, 12);
/** The price of test/multi: $0.04 an image. */
const PRICING = {
	[MULTI_MODEL.id]: [{ pricing: [{ billable: "output_image", costUsd: 0.04, unit: "image" }], provider: "test" }],
};

type ToolArguments = Readonly<Record<string, boolean | number | string>>;

interface Harness {
	readonly callAsync: (name: string, args: ToolArguments) => Promise<CallToolResult<undefined>>;
	readonly cwd: string;
	/** Every request that reached OpenRouter, which is what gets billed. */
	readonly sent: Array<CreateImagesRequest>;
	readonly session: ReturnType<InMemoryTransport["session"]>;
}

const isSavedRun = type({ images: type({ path: "string" }).array() });
const isHistoryList = type({ runs: type({ prompt: "string" }).array() });
const isRun = type({ prompt: "string" });

async function createPngBase64Async(): Promise<string> {
	const png = await sharp({ create: { background: "#ff0000", channels: 3, height: 4, width: 4 } })
		.png()
		.toBuffer();
	return png.toString("base64");
}

interface HarnessOptions {
	readonly defaultModel?: string | undefined;
	readonly models?: ReadonlyArray<ImageModelListItem> | undefined;
	/** Models whose provider answers 429, which bills nothing. */
	readonly rateLimited?: ReadonlyArray<string> | undefined;
}

function createRateLimitError(): OpenRouterError {
	const body = JSON.stringify({ error: { message: "You exceeded your current quota." } });
	return new OpenRouterError("Rate limited", {
		body,
		request: new Request("https://openrouter.ai/api/v1/images"),
		response: new Response(body, { status: 429 }),
	});
}

async function createHarnessAsync({
	defaultModel,
	models = [MULTI_MODEL],
	rateLimited = [],
}: HarnessOptions = {}): Promise<Harness> {
	const cwd = await mkdtemp(nodePath.join(tmpdir(), "darkroom-mcp-"));
	const historyRoot = await mkdtemp(nodePath.join(tmpdir(), "darkroom-mcp-history-"));
	const history = createHistoryStore(historyRoot);
	const png = await createPngBase64Async();
	const sent: Array<CreateImagesRequest> = [];

	const dependencies: McpDependencies = {
		cwd,
		defaultModel,
		async getImagesClientAsync(): Promise<ImagesClient> {
			return {
				// oxlint-disable-next-line small-rules/require-async-suffix -- implements the SDK method name
				async generate(request): Promise<CreateImagesResponse> {
					if (rateLimited.includes(request.imageGenerationRequest.model)) throw createRateLimitError();
					sent.push(request);
					return {
						created: 0,
						data: Array.from({ length: request.imageGenerationRequest.n ?? 1 }, () => ({
							b64Json: png,
							mediaType: "image/png",
						})),
						usage: {
							completionTokens: 0,
							cost: 0.04 * (request.imageGenerationRequest.n ?? 1),
							promptTokens: 0,
							totalTokens: 0,
						},
					};
				},
			};
		},
		async getModelsAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
			return models;
		},
		async getObservedPricesAsync(): Promise<ObservedPrices> {
			return new Map();
		},
		async getPricingAsync(): Promise<ModelPricing> {
			return PRICING;
		},
		history,
		async loadReferenceAsync(source): Promise<ReferenceImage> {
			throw new Error(`No references in these tests: ${source}`);
		},
		now: () => NOW,
		toPreviewAsync: createPreviewAsync,
		warn(): void {
			// Warnings are not under test.
		},
	};

	await appendAsync(history, createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { model: MULTI_MODEL.id, prompt: "older" }));
	await appendAsync(history, createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { model: MULTI_MODEL.id, prompt: "newer" }));

	const transport = new InMemoryTransport(createDarkroomServer(dependencies));
	const session = transport.session();
	await session.initialize("2025-06-18", {}, { name: "test", version: "1.0.0" });

	return {
		async callAsync(name, args): Promise<CallToolResult<undefined>> {
			return session.callTool(name, args);
		},
		cwd,
		sent,
		session,
	};
}

function readJson<Schema extends Type>(result: CallToolResult<undefined>, schema: Schema): Schema["infer"] {
	const json = result.content?.findLast((item) => item.type === "text");
	if (json?.type !== "text") {
		throw new Error("Expected the result to have JSON text.");
	}
	return schema.assert(JSON.parse(json.text));
}

function getSentModels(sent: ReadonlyArray<CreateImagesRequest>): Array<string> {
	return sent.map(({ imageGenerationRequest }) => imageGenerationRequest.model);
}

describe("darkroom MCP server", () => {
	// Catches a schema that can't become JSON Schema, hiding every tool.
	it("lists generate-image with prompt as its one required input", async ({ expect }) => {
		expect.assertions(1);

		const { session } = await createHarnessAsync();
		const { tools } = await session.listTools();

		expect(tools.find((item) => item.name === "generate-image")?.inputSchema).toMatchObject({
			required: ["prompt"],
		});
	});

	// Catches a call with only a prompt failing for want of a model.
	it("generates from only a prompt, with no default model set", async ({ expect }) => {
		expect.assertions(2);

		const { callAsync, sent } = await createHarnessAsync();
		const result = await callAsync("generate-image", { prompt: "a lighthouse" });

		expect(result.isError).not.toBe(true);
		expect(getSentModels(sent)).toStrictEqual([MULTI_MODEL.id]);
	});

	// Catches the default model being ignored when a call leaves model out.
	it("prefers DARKROOM_MODEL when model is left out", async ({ expect }) => {
		expect.assertions(1);

		const { callAsync, sent } = await createHarnessAsync({
			defaultModel: SINGLE_MODEL.id,
			models: [MULTI_MODEL, SINGLE_MODEL],
		});
		await callAsync("generate-image", { prompt: "a lighthouse" });

		expect(getSentModels(sent)).toStrictEqual([SINGLE_MODEL.id]);
	});

	// Catches one provider's quota error ending a call another model could serve.
	it("moves to another model when the picked one is rate limited", async ({ expect }) => {
		expect.assertions(2);

		const { callAsync, sent } = await createHarnessAsync({
			defaultModel: SINGLE_MODEL.id,
			models: [MULTI_MODEL, SINGLE_MODEL],
			rateLimited: [SINGLE_MODEL.id],
		});
		const result = await callAsync("generate-image", { prompt: "a lighthouse" });

		expect(result.isError).not.toBe(true);
		expect(getSentModels(sent)).toStrictEqual([MULTI_MODEL.id]);
	});

	// Catches a model the caller named being swapped for another.
	it("doesn't move away from a model the caller named", async ({ expect }) => {
		expect.assertions(2);

		const { callAsync, sent } = await createHarnessAsync({
			models: [MULTI_MODEL, SINGLE_MODEL],
			rateLimited: [SINGLE_MODEL.id],
		});
		const result = await callAsync("generate-image", { model: SINGLE_MODEL.id, prompt: "a lighthouse" });

		expect(result.isError).toBe(true);
		expect(sent).toHaveLength(0);
	});

	// Catches a provider rejecting a parameter its model never declared.
	it("leaves out options the model doesn't take", async ({ expect }) => {
		expect.assertions(2);

		const { callAsync, sent } = await createHarnessAsync({ models: [SINGLE_MODEL] });
		const result = await callAsync("generate-image", {
			model: SINGLE_MODEL.id,
			prompt: "a lighthouse",
			type: "png",
		});

		expect(result.isError).not.toBe(true);
		expect(sent.map(({ imageGenerationRequest }) => imageGenerationRequest.outputFormat)).toStrictEqual([
			undefined,
		]);
	});

	// Catches money being spent past the caller's limit.
	it("refuses a generation estimated over maxCost without sending it", async ({ expect }) => {
		expect.assertions(3);

		const { callAsync, cwd, sent } = await createHarnessAsync();
		const result = await callAsync("generate-image", {
			count: 2,
			maxCost: 0.05,
			model: MULTI_MODEL.id,
			prompt: "a lighthouse",
		});

		expect(result.isError).toBe(true);
		expect(sent).toHaveLength(0);
		await expect(readdir(cwd)).resolves.toStrictEqual([]);
	});

	// Catches images being written to stdout, which would corrupt the MCP stream.
	it("refuses - as the output", async ({ expect }) => {
		expect.assertions(2);

		const { callAsync, sent } = await createHarnessAsync();
		const result = await callAsync("generate-image", {
			model: MULTI_MODEL.id,
			output: "-",
			prompt: "a lighthouse",
		});

		expect(result.isError).toBe(true);
		expect(sent).toHaveLength(0);
	});

	// Catches a finished run whose images the caller can't find or see.
	it("saves the images and returns their paths and previews", async ({ expect }) => {
		expect.assertions(4);

		const { callAsync, cwd } = await createHarnessAsync();
		const result = await callAsync("generate-image", {
			count: 2,
			maxCost: 0.1,
			model: MULTI_MODEL.id,
			prompt: "a lighthouse",
		});
		const { images } = readJson(result, isSavedRun);

		expect(result.isError).not.toBe(true);
		expect(images.map(({ path }) => nodePath.dirname(path))).toStrictEqual([cwd, cwd]);
		await expect(Promise.all(images.map(async ({ path }) => access(path)))).resolves.toBeDefined();
		expect(result.content?.filter((item) => item.type === "image")).toHaveLength(2);
	});

	// Catches the history being shown oldest first, burying the run just made.
	it("lists past runs newest first", async ({ expect }) => {
		expect.assertions(1);

		const { callAsync } = await createHarnessAsync();
		const { runs } = readJson(await callAsync("list-history", {}), isHistoryList);

		expect(runs.map(({ prompt }) => prompt)).toStrictEqual(["newer", "older"]);
	});

	// Catches `last` resolving to some run other than the most recent.
	it("shows the most recent run for last", async ({ expect }) => {
		expect.assertions(1);

		const { callAsync } = await createHarnessAsync();

		expect(readJson(await callAsync("show-run", { run: "last" }), isRun)).toMatchObject({ prompt: "newer" });
	});

	// Catches a re-run sending a different prompt than the run it repeats.
	it("re-runs a past run with its stored prompt", async ({ expect }) => {
		expect.assertions(1);

		const { callAsync, sent } = await createHarnessAsync();
		await callAsync("rerun", { maxCost: 1, run: "last~1" });

		expect(sent.map(({ imageGenerationRequest }) => imageGenerationRequest.prompt)).toStrictEqual(["older"]);
	});
});
