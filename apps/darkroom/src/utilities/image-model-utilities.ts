import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import nodePath from "node:path";

import { environmentPaths } from "$constants/environment-paths";
import { isImageModelListItem } from "$types/openrouter-types";

import type { ImageModelListItem } from "@openrouter/sdk/models";

export async function getImageModelsRawAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
	const { data } = await import("$functions/get-openrouter-async").then(async ({ getOpenRouterAsync }) => {
		const openrouter = await getOpenRouterAsync();
		return openrouter.images.listModels({}, {});
	});

	const imageModels: Array<ImageModelListItem> = [];
	let size = 0;

	for (const imageModel of data) {
		if (!imageModel.architecture.inputModalities.includes("text")) continue;
		imageModels[size++] = imageModel;
	}

	return imageModels;
}

const CACHE_FILE = nodePath.join(environmentPaths.cache, "image-models.json");
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

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
