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
	ImageModelIds = 2,
	/** One line per model and parameter: `id<Tab>parameter<Tab>value<Tab>…`. */
	ModelParameters = 3,
}

/** The enum parameters whose values are completed per model. */
const COMPLETED_PARAMETERS: ReadonlyArray<string> = [
	"aspect_ratio",
	"background",
	"output_format",
	"quality",
	"resolution",
];

function getCompletionFile(completionKind: CompletionKind): string {
	return nodePath.join(environmentPaths.cache, `${completionKind}.txt`);
}

function getParameterLines(imageModel: ImageModelListItem): Array<string> {
	const lines: Array<string> = [];
	for (const parameter of COMPLETED_PARAMETERS) {
		const descriptor = imageModel.supportedParameters[parameter];
		if (descriptor?.type === "enum") lines.push([imageModel.id, parameter, ...descriptor.values].join("\t"));
	}
	return lines;
}

function createCompletions(imageModels: ReadonlyArray<ImageModelListItem>): Record<CompletionKind, Array<string>> {
	return {
		[CompletionKind.ImageModelIds]: imageModels.map(({ id }) => id),
		[CompletionKind.ModelParameters]: imageModels.flatMap(getParameterLines),
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
				getCompletionFile(CompletionKind.ImageModelIds),
				completions[CompletionKind.ImageModelIds].join("\n"),
				"utf8",
			),
			writeFile(
				getCompletionFile(CompletionKind.ModelParameters),
				completions[CompletionKind.ModelParameters].join("\n"),
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
			return content.length === 0 ? [] : content.split("\n");
		}
	} catch {
		// The cache file does not exist.
	}

	const completions = await refreshCompletionCacheAsync();
	return completions[completionKind];
}
