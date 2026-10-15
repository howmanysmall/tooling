import { StringType } from "@cliffy/command";

export const aspectRatioType = new StringType();

export async function getAspectRatiosAsync(): Promise<Array<string>> {
	const { getParameterCompletionsAsync } = await import("$utilities/model-parameter-completions");
	return getParameterCompletionsAsync("aspect_ratio");
}
