import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import nodePath from "node:path";

import { CACHE_TTL_MS } from "$constants";
import { environmentPaths } from "$constants/environment-paths";
import { READ_ONLY_RETRIES } from "$constants/request-options";
import { isImageModelListItem } from "$types/openrouter-types";

import type { ImageModelListItem } from "@openrouter/sdk/models";

async function listImageModelsAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
	const [{ getOpenRouterAsync }, { toApiError }] = await Promise.all([
		import("$functions/get-openrouter-async"),
		import("$errors/to-api-error"),
	]);
	const openrouter = await getOpenRouterAsync();

	try {
		const { data } = await openrouter.images.listModels({}, { retries: READ_ONLY_RETRIES });
		return data;
	} catch (error) {
		throw error instanceof Error ? toApiError(error, false) : error;
	}
}

export async function getImageModelsRawAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
	const data = await listImageModelsAsync();

	const imageModels: Array<ImageModelListItem> = [];
	let size = 0;

	for (const imageModel of data) {
		if (!imageModel.architecture.inputModalities.includes("text")) continue;
		imageModels[size++] = imageModel;
	}

	return imageModels;
}

const CACHE_FILE = nodePath.join(environmentPaths.cache, "image-models.json");

const isImageModelListItems = isImageModelListItem.array().readonly();

export async function getImageModelsAsync(usingCache = true): Promise<ReadonlyArray<ImageModelListItem>> {
	if (usingCache) {
		try {
			const stats = await stat(CACHE_FILE);
			if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
				const content = await readFile(CACHE_FILE, "utf8");
				return isImageModelListItems.assert(JSON.parse(content));
			}
		} catch {
			// The cache file does not exist or is invalid.
		}
	}

	const imageModels = await getImageModelsRawAsync();

	try {
		await mkdir(environmentPaths.cache, { recursive: true });
		await writeFile(CACHE_FILE, JSON.stringify(imageModels), "utf8");
	} catch {
		// Ignore disk write errors.
	}

	return imageModels;
}
