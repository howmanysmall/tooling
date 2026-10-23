import { StringType } from "@cliffy/command";

import { cacheCompletionFunction } from "$functions/cache-completion-function";
import { compareWithLocale } from "$functions/compare-with-locale";
import { CompletionKind } from "$utilities/completion-cache-utilities";

export const imageModelIdType = new StringType();

export async function getImageModelIdsAsync(): Promise<Array<string>> {
	return import("$utilities/completion-cache-utilities").then(async ({ getCompletionsAsync }) =>
		getCompletionsAsync(CompletionKind.ImageModelIds),
	);
}

/** The providers in the model IDs, like `google` in `google/gemini-…`. */
export const getProvidersAsync = cacheCompletionFunction("providers", async () => {
	const ids = await getImageModelIdsAsync();
	return [...new Set(ids.map((id) => id.split("/", 1)[0] ?? id))].toSorted(compareWithLocale);
});
