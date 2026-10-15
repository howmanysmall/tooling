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

async function completeAsync(parameter: string): Promise<Array<string>> {
	const { getParameterCompletionsAsync } = await import("$utilities/model-parameter-completions");
	return getParameterCompletionsAsync(parameter);
}

export async function getBackgroundsAsync(): Promise<Array<string>> {
	return completeAsync("background");
}

export async function getImageTypesAsync(): Promise<Array<string>> {
	const declared = await completeAsync("output_format");
	return declared.length === 0 ? [...IMAGE_TYPES] : declared;
}

export async function getQualitiesAsync(): Promise<Array<string>> {
	return completeAsync("quality");
}

export async function getResolutionsAsync(): Promise<Array<string>> {
	return completeAsync("resolution");
}
