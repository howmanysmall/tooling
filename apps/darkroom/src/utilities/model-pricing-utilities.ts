import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { isMaybeString, isNumber, isString } from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

import { CACHE_TTL_MS } from "$constants";
import { environmentPaths } from "$constants/environment-paths";
import { READ_ONLY_RETRIES } from "$constants/request-options";

import type { EndpointPricing } from "$generation/cost-estimate";

const CACHE_FILE = nodePath.join(environmentPaths.cache, "model-pricing.json");
const BATCH_SIZE = 8;

const isPricingEntry = type({
	billable: isString,
	costUsd: isNumber,
	unit: isString,
	"variant?": isMaybeString,
}).readonly();
const isEndpointPricing = type({
	pricing: isPricingEntry.array().readonly(),
	provider: isString,
}).readonly();
const isModelPricing = type({
	"[string]": isEndpointPricing.array().readonly(),
}).readonly();

/** Each model's endpoints and their prices, keyed by model ID. */
export type ModelPricing = Readonly<Record<string, ReadonlyArray<EndpointPricing>>>;

async function fetchEndpointsAsync(modelId: string): Promise<Array<EndpointPricing>> {
	const { getOpenRouterAsync } = await import("$functions/get-openrouter-async");
	const openrouter = await getOpenRouterAsync();
	const slash = modelId.indexOf("/");
	const { endpoints } = await openrouter.images.listModelEndpoints(
		{ author: modelId.slice(0, slash), slug: modelId.slice(slash + 1) },
		{ retries: READ_ONLY_RETRIES },
	);

	return endpoints.map((endpoint) => ({
		pricing: endpoint.pricing.map((entry) => ({
			billable: entry.billable,
			costUsd: entry.costUsd,
			unit: entry.unit,
			variant: entry.variant,
		})),
		provider: endpoint.providerSlug,
	}));
}

/**
 * Fetches every model's prices from OpenRouter.
 *
 * @param modelIds - The models to price.
 * @param warn - Receives a warning for each model whose prices can't be read.
 * @returns The prices, keyed by model ID.
 */
export async function fetchModelPricingAsync(
	modelIds: ReadonlyArray<string>,
	warn: (message: string) => void,
): Promise<Record<string, Array<EndpointPricing>>> {
	async function fetchOneAsync(modelId: string): Promise<readonly [string, Array<EndpointPricing>]> {
		try {
			return [modelId, await fetchEndpointsAsync(modelId)] as const;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			warn(`Could not read prices for ${modelId}: ${message}`);
			return [modelId, []] as const;
		}
	}

	const entries: Array<readonly [string, Array<EndpointPricing>]> = [];
	for (let start = 0; start < modelIds.length; start += BATCH_SIZE) {
		const batch = modelIds.slice(start, start + BATCH_SIZE);
		// oxlint-disable-next-line no-await-in-loop, unicorn/no-array-callback-reference -- batches keep at most BATCH_SIZE requests in flight, single parameter function
		const fetched = await Promise.all(batch.map(fetchOneAsync));
		for (const entry of fetched) {
			entries.push(entry);
		}
	}

	return Object.fromEntries(entries);
}

async function readCacheAsync(): Promise<ModelPricing | undefined> {
	try {
		const stats = await stat(CACHE_FILE);
		if (Date.now() - stats.mtimeMs >= CACHE_TTL_MS) return undefined;

		const result = isModelPricing(JSON.parse(await readFile(CACHE_FILE, "utf8")));
		return result instanceof type.errors ? undefined : result;
	} catch {
		return undefined;
	}
}

/**
 * Gets every model's prices, from `model-pricing.json` when it is fresh and
 * from OpenRouter otherwise.
 *
 * @param usingCache - Whether a fresh cache may be used.
 * @param warn - Receives a warning for each model whose prices can't be read.
 * @returns The prices, keyed by model ID.
 */
export async function getModelPricingAsync(
	usingCache: boolean,
	warn: (message: string) => void,
): Promise<ModelPricing> {
	if (usingCache) {
		const cached = await readCacheAsync();
		if (cached !== undefined) return cached;
	}

	const { getImageModelsAsync } = await import("$utilities/image-model-utilities");
	const models = await getImageModelsAsync(usingCache);
	const pricing = await fetchModelPricingAsync(
		models.map(({ id }) => id),
		warn,
	);

	try {
		await mkdir(environmentPaths.cache, { recursive: true });
		await writeFile(CACHE_FILE, JSON.stringify(pricing), "utf8");
	} catch {
		// Ignore disk write errors.
	}

	return pricing;
}
