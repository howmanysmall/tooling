import { StringType } from "@cliffy/command";

export const openrouterModelType = new StringType();

export async function getOpenRouterImageModelsAsync(): Promise<Array<string>> {
	const responseArray = await import("$functions/get-image-models-async").then(async ({ getImageModelsAsync }) =>
		getImageModelsAsync(),
	);

	const imageModels: Array<string> = [];
	let size = 0;

	for (const imageModel of responseArray) {
		if (!imageModel.architecture.inputModalities.includes("text")) continue;
		imageModels[size++] = imageModel.id;
	}

	return imageModels;
}
