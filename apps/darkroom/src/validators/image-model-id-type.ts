import { StringType } from "@cliffy/command";

export const imageModelIdType = new StringType();

export async function getImageModelIdsAsync(): Promise<Array<string>> {
	const imageModels = await import("$functions/get-image-models-async").then(async ({ getImageModelsAsync }) =>
		getImageModelsAsync(),
	);

	const ids: Array<string> = [];
	let size = 0;

	for (const imageModel of imageModels) ids[size++] = imageModel.id;
	return ids;
}
