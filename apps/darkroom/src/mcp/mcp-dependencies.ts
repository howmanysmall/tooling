import { stat } from "node:fs/promises";
import nodePath from "node:path";

import { prepareGenerationAsync } from "$generation/run-generation";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { ReferenceImage } from "$generation/references";
import type { GenerationInput, ImagesClient, PreparedGeneration } from "$generation/run-generation";
import type { HistoryStore } from "$history/history-store";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

/** Everything the tools reach outside the process for, so tests can fake it. */
export interface McpDependencies {
	/** Where relative paths resolve: where the client started darkroom. */
	readonly cwd: string;
	/** The model to use when a call names none: `DARKROOM_MODEL`. */
	readonly getDefaultModelAsync: () => Promise<string | undefined>;
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
 * Validates a generation against the model list. Standard output is never a
 * terminal here: it carries the MCP stream.
 *
 * @param dependencies - The model list and the working directory.
 * @param input - What to generate.
 * @returns The prepared request, with its warnings.
 */
export async function prepareAsync(dependencies: McpDependencies, input: GenerationInput): Promise<PreparedGeneration> {
	const models = await dependencies.getModelsAsync();
	return prepareGenerationAsync(input, {
		cwd: dependencies.cwd,
		async isDirectoryAsync(path) {
			return isDirectoryAsync(nodePath.resolve(dependencies.cwd, path));
		},
		models,
		stdoutIsTty: false,
	});
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
		cwd,
		async getDefaultModelAsync(): Promise<string | undefined> {
			const { getEnvironmentAsync } = await import("$functions/get-environment-async");
			const { DARKROOM_MODEL } = await getEnvironmentAsync();
			return DARKROOM_MODEL;
		},
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
