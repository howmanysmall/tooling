import { StringType } from "@cliffy/command";

export const aspectRatioType = new StringType();

export async function getAspectRatiosAsync(): Promise<Array<string>> {
	const imageModels = await import("$functions/get-image-models-async").then(async ({ getImageModelsAsync }) =>
		getImageModelsAsync(),
	);

	const aspectRatios = new Set<string>();

	for (const { supportedParameters } of imageModels) {
		if (!("aspect_ratio" in supportedParameters)) continue;

		const aspectRatio = supportedParameters.aspect_ratio;
		if (aspectRatio.type !== "enum") continue;
		for (const value of aspectRatio.values) aspectRatios.add(value);
	}

	return [...aspectRatios];
}
