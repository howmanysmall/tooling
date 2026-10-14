import { StringType } from "@cliffy/command";

export const openrouterModelType = new StringType();

export async function getOpenRouterImageModelsAsync(): Promise<Array<string>> {
	const openrouter = await import("$functions/get-openrouter-async").then(async ({ getOpenRouterAsync }) =>
		getOpenRouterAsync(),
	);

	const { data } = await openrouter.images.listModels({}, {});
}
