import type { ImageModelListItem } from "@openrouter/sdk/models";

let imageModelsCache: ReadonlyArray<ImageModelListItem> | undefined;

export async function getImageModelsAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
	if (imageModelsCache !== undefined) return imageModelsCache;

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

	imageModelsCache = imageModels;
	return imageModels;
}

if (import.meta.main) {
	// oxlint-disable-next-line antfu/no-top-level-await -- this is wrapped.
	const imageModels = await getImageModelsAsync();
	console.log(JSON.stringify(imageModels, undefined, "\t"));
}
