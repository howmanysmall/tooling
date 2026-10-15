import { StringType } from "@cliffy/command";

import { CompletionKind } from "$utilities/completion-cache-utilities";

export const aspectRatioType = new StringType();

export async function getAspectRatiosAsync(): Promise<Array<string>> {
	return import("$utilities/completion-cache-utilities").then(async ({ getCompletionsAsync }) =>
		getCompletionsAsync(CompletionKind.AspectRatios),
	);
}
