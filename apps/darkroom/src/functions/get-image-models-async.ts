import type { ImageModelListItem } from "@openrouter/sdk/models";

let imageModelsCache: ReadonlyArray<ImageModelListItem> | undefined;

export async function getImageModelsAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
	if (imageModelsCache !== undefined) return imageModelsCache;

	const { data } = await import("$functions/get-openrouter-async").then(async ({ getOpenRouterAsync }) => {
		const openrouter = await getOpenRouterAsync();
		return openrouter.images.listModels({}, {});
	});

	imageModelsCache = data;
	return data;
}
