import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import nodePath from "node:path";

import { CACHE_TTL_MS } from "$constants";
import { environmentPaths } from "$constants/environment-paths";

import type { ImageModelListItem } from "@openrouter/sdk/models";

// Shell completions spawn a fresh process per keystroke, so the read path here
// stays free of arktype and the OpenRouter SDK; loading either costs more than
// the lookup itself. Each list is stored as plain lines so reading it needs no
// validation.

export const enum CompletionKind {
	AspectRatios = 1,
	ImageModelIds = 2,
}

function getCompletionFile(completionKind: CompletionKind): string {
	return nodePath.join(environmentPaths.cache, `${completionKind}.txt`);
}

function createCompletions(imageModels: ReadonlyArray<ImageModelListItem>): Record<CompletionKind, Array<string>> {
	const aspectRatios = new Set<string>();
	const imageModelIds: Array<string> = [];
	let size = 0;

	for (const { id, supportedParameters } of imageModels) {
		imageModelIds[size++] = id;

		const aspectRatio = supportedParameters.aspect_ratio;
		if (aspectRatio?.type !== "enum") continue;
		for (const value of aspectRatio.values) aspectRatios.add(value);
	}

	return {
		[CompletionKind.AspectRatios]: [...aspectRatios],
		[CompletionKind.ImageModelIds]: imageModelIds,
	};
}

export async function refreshCompletionCacheAsync(usingCache = true): Promise<Record<CompletionKind, Array<string>>> {
	const imageModels = await import("$utilities/image-model-utilities").then(async ({ getImageModelsAsync }) =>
		getImageModelsAsync(usingCache),
	);
	const completions = createCompletions(imageModels);

	try {
		await mkdir(environmentPaths.cache, { recursive: true });
		await Promise.all([
			writeFile(
				getCompletionFile(CompletionKind.AspectRatios),
				completions[CompletionKind.AspectRatios].join("\n"),
				"utf8",
			),
			writeFile(
				getCompletionFile(CompletionKind.ImageModelIds),
				completions[CompletionKind.ImageModelIds].join("\n"),
				"utf8",
			),
		]);
	} catch {
		// Ignore disk write errors.
	}

	return completions;
}

export async function getCompletionsAsync(completionKind: CompletionKind): Promise<Array<string>> {
	const completionFile = getCompletionFile(completionKind);

	try {
		const stats = await stat(completionFile);
		if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
			const content = await readFile(completionFile, "utf8");
			return content === "" ? [] : content.split("\n");
		}
	} catch {
		// The cache file does not exist.
	}

	const completions = await refreshCompletionCacheAsync();
	return completions[completionKind];
}
