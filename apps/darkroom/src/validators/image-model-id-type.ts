import { StringType } from "@cliffy/command";

import { CompletionKind } from "$utilities/completion-cache-utilities";

export const imageModelIdType = new StringType();

export async function getImageModelIdsAsync(): Promise<Array<string>> {
	return import("$utilities/completion-cache-utilities").then(async ({ getCompletionsAsync }) =>
		getCompletionsAsync(CompletionKind.ImageModelIds),
	);
}
