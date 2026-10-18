import { getModelExamples } from "$interactive/models/model-examples";
import { readShippedExamplesAsync } from "$interactive/models/shipped-examples";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { HistoryEntry } from "$history/history-entry";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

/** The models and what they cost, before their example images. */
export interface ModelSource {
	readonly models: ReadonlyArray<ImageModelListItem>;
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
}

/** The models tab and the prompt box's models, or why they couldn't load. */
export type CatalogLoad =
	| { readonly catalog: ModelCatalog; readonly preferred?: string | undefined }
	| { readonly error: string };

async function loadModelSourceAsync(history: ReadonlyArray<HistoryEntry>): Promise<ModelSource> {
	const [{ getImageModelsAsync }, { getModelPricingAsync }, { getObservedPrices }] = await Promise.all([
		import("$utilities/image-model-utilities"),
		import("$utilities/model-pricing-utilities"),
		import("$generation/observed-prices"),
	]);
	const [models, pricing] = await Promise.all([
		getImageModelsAsync(),
		// A warning written now would tear the full-screen app; a model
		// without prices shows a dash instead.
		getModelPricingAsync(true, () => undefined),
	]);
	return { models, observed: getObservedPrices(history), pricing };
}

/**
 * Loads what the models tab and the prompt box need, while the app is
 * already showing. A failure, such as no network and no cache, becomes a
 * message for those tabs rather than closing the app.
 *
 * @param history - Past runs, for prices and your example images.
 * @param resolve - Turns a stored path into an absolute one.
 * @param source - Models already loaded, as `models list` does with its
 *   filters; otherwise every model is loaded.
 * @returns The catalog and `DARKROOM_MODEL`, or the error's message.
 */
export async function loadCatalogAsync(
	history: ReadonlyArray<HistoryEntry>,
	resolve: (stored: string) => string,
	source?: ModelSource,
): Promise<CatalogLoad> {
	try {
		const { getEnvironmentAsync } = await import("$functions/get-environment-async");
		const [models, shippedExamples, { DARKROOM_MODEL }] = await Promise.all([
			source ?? loadModelSourceAsync(history),
			readShippedExamplesAsync(),
			getEnvironmentAsync(),
		]);
		const yourExamples = getModelExamples(history, resolve);
		return { catalog: { ...models, shippedExamples, yourExamples }, preferred: DARKROOM_MODEL };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}
