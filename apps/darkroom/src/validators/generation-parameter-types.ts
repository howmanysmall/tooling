import { EnumType, StringType } from "@cliffy/command";

import { IMAGE_TYPES } from "$generation/media-types";

/** `--type`: the encodings the API can return. */
export const imageTypeType = new EnumType(IMAGE_TYPES);

/**
 * `--background`, `--quality`, and `--resolution` are checked against the
 * chosen model rather than a fixed list, because models declare subsets.
 */
export const backgroundType = new StringType();
export const qualityType = new StringType();
export const resolutionType = new StringType();

/**
 * Completes a model parameter for the model on the command line, or for the
 * stored run when completing `history rerun <id>`.
 *
 * @param parameter - The wire name, such as `aspect_ratio`.
 * @returns The values to offer.
 */
export async function completeModelParameterAsync(parameter: string): Promise<Array<string>> {
	const [{ getParameterCompletionsAsync }, { getRerunModelAsync }] = await Promise.all([
		import("$utilities/model-parameter-completions"),
		import("$history/history-completions"),
	]);

	return getParameterCompletionsAsync(parameter, getRerunModelAsync);
}

export async function getBackgroundsAsync(): Promise<Array<string>> {
	return completeModelParameterAsync("background");
}

export async function getImageTypesAsync(): Promise<Array<string>> {
	const declared = await completeModelParameterAsync("output_format");
	return declared.length === 0 ? [...IMAGE_TYPES] : declared;
}

export async function getQualitiesAsync(): Promise<Array<string>> {
	return completeModelParameterAsync("quality");
}

export async function getResolutionsAsync(): Promise<Array<string>> {
	return completeModelParameterAsync("resolution");
}
