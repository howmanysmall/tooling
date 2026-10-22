import { stat } from "node:fs/promises";
import nodePath from "node:path";

import { prepareGenerationAsync } from "$generation/run-generation";

import { fitOptions } from "./model-choice";
import { chooseOutputDirectoryAsync } from "./output-directory";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ReferenceImage } from "$generation/references";
import type { GenerationInput, ImagesClient, PreparedGeneration } from "$generation/run-generation";
import type { HistoryStore } from "$history/history-store";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

/** Everything the tools reach outside the process for, so tests can fake it. */
export interface McpDependencies {
	/**
	 * Where images go by default and relative paths resolve: where the client
	 * started darkroom, or `~/Pictures/darkroom` when that can't be written.
	 */
	readonly cwd: string;
	/**
	 * The model to use when a call names none: `DARKROOM_MODEL`, read at
	 * startup so the tool schemas can say whether `model` is required.
	 */
	readonly defaultModel: string | undefined;
	readonly getImagesClientAsync: () => Promise<ImagesClient>;
	readonly getModelsAsync: () => Promise<ReadonlyArray<ImageModelListItem>>;
	readonly getObservedPricesAsync: () => Promise<ObservedPrices>;
	readonly getPricingAsync: () => Promise<ModelPricing>;
	readonly history: HistoryStore;
	readonly loadReferenceAsync: (source: string) => Promise<ReferenceImage>;
	readonly now: () => Date;
	/** Shrinks a saved image for the tool result; `undefined` when it can't. */
	readonly toPreviewAsync: (path: string) => Promise<Preview | undefined>;
	/** Problems that don't fail the call; they go to stderr, never stdout. */
	readonly warn: (message: string) => void;
}

export interface Preview {
	/** Base64. */
	readonly data: string;
	readonly mediaType: string;
}

async function isDirectoryAsync(path: string): Promise<boolean> {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Validates a generation against the model list, leaving out options the
 * model doesn't take. Standard output is never a terminal here: it carries
 * the MCP stream.
 *
 * @param dependencies - The model list and the working directory.
 * @param input - What to generate.
 * @param isPicked - Whether darkroom chose the model, so options it doesn't
 *   support are left out instead of refused.
 * @returns The prepared request, with its warnings.
 */
export async function prepareAsync(
	dependencies: McpDependencies,
	input: GenerationInput,
	isPicked = false,
): Promise<PreparedGeneration> {
	const models = await dependencies.getModelsAsync();
	const model = models.find((item) => item.id === input.modelId);
	const fitted = model === undefined ? undefined : fitOptions(model, input.options, isPicked);
	const prepared = await prepareGenerationAsync(
		fitted === undefined ? input : { ...input, options: fitted.options },
		{
			cwd: dependencies.cwd,
			async isDirectoryAsync(path) {
				return isDirectoryAsync(nodePath.resolve(dependencies.cwd, path));
			},
			models,
			stdoutIsTty: false,
		},
	);
	return fitted === undefined ? prepared : { ...prepared, warnings: [...fitted.warnings, ...prepared.warnings] };
}

/** The longest edge of a preview sent back to the client, in pixels. */
const PREVIEW_EDGE = 1024;

/**
 * Makes a small WebP of a saved image, so a tool result stays within client
 * size limits. The full image stays on disk at its path.
 *
 * @param path - The saved image.
 * @returns The preview, or `undefined` when the image can't be decoded.
 */
export async function createPreviewAsync(path: string): Promise<Preview | undefined> {
	try {
		const { default: sharp } = await import("sharp");
		const webp = await sharp(path)
			.resize({ fit: "inside", height: PREVIEW_EDGE, width: PREVIEW_EDGE, withoutEnlargement: true })
			.webp()
			.toBuffer();
		return { data: webp.toString("base64"), mediaType: "image/webp" };
	} catch {
		return undefined;
	}
}

/**
 * Reads `DARKROOM_MODEL`. A malformed environment shouldn't stop the server
 * from starting, since the free tools work without it, so this treats one as
 * having no default; a paid call still reports the problem.
 *
 * @returns The default model, if one is set.
 */
async function readDefaultModelAsync(): Promise<string | undefined> {
	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	try {
		const { DARKROOM_MODEL } = await getEnvironmentAsync();
		return DARKROOM_MODEL;
	} catch {
		return undefined;
	}
}

/**
 * Wires the tools to OpenRouter, the caches, and the history on disk.
 *
 * @param cwd - The directory relative output paths resolve against.
 * @returns The real dependencies.
 */
export async function createDefaultDependenciesAsync(cwd: string): Promise<McpDependencies> {
	const [
		{ getHistoryStore, log, readObservedPricesAsync },
		{ getImageModelsAsync },
		{ getModelPricingAsync },
		{ isUrl, loadReferenceAsync },
	] = await Promise.all([
		import("$generation/cli-runner"),
		import("$utilities/image-model-utilities"),
		import("$utilities/model-pricing-utilities"),
		import("$generation/references"),
	]);

	return {
		cwd: await chooseOutputDirectoryAsync(cwd),
		defaultModel: await readDefaultModelAsync(),
		async getImagesClientAsync(): Promise<ImagesClient> {
			const { getOpenRouterAsync } = await import("$functions/get-openrouter-async");
			const openrouter = await getOpenRouterAsync();
			return openrouter.images;
		},
		async getModelsAsync(): Promise<ReadonlyArray<ImageModelListItem>> {
			return getImageModelsAsync();
		},
		getObservedPricesAsync: readObservedPricesAsync,
		async getPricingAsync(): Promise<ModelPricing> {
			return getModelPricingAsync(true, (message) => {
				log.debug(message);
			});
		},
		history: getHistoryStore(),
		async loadReferenceAsync(source): Promise<ReferenceImage> {
			return loadReferenceAsync(isUrl(source) ? source : nodePath.resolve(cwd, source));
		},
		now: () => new Date(),
		toPreviewAsync: createPreviewAsync,
		warn(message): void {
			log.warn(message);
		},
	};
}
