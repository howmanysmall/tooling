import { render } from "ink";

import { getHistoryStore } from "$generation/cli-runner";

import { ModelBrowserScreen } from "./model-browser-screen";
import { getModelExamples } from "./model-examples";
import { readShippedExamplesAsync } from "./shipped-examples";
import { createTerminalPreviewsAsync } from "./terminal-previews";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { HistoryEntry } from "$history/history-entry";
import type { PreviewCache } from "$preview/preview-cache";
import type { ModelSort } from "$utilities/model-filters";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { ModelBrowserServices } from "./model-browser-services";
import type { ModelCatalog } from "./model-browser-state";
import type { ModelExample } from "./model-examples";

export interface ModelBrowserInput {
	/** Past runs, for the newest image you made with each model. */
	readonly history: ReadonlyArray<HistoryEntry>;
	readonly models: ReadonlyArray<ImageModelListItem>;
	readonly observed: ObservedPrices;
	readonly pricing: ModelPricing;
}

interface ModelChoice {
	readonly getChosen: () => ImageModelListItem | undefined;
	readonly handleChoose: (model: ImageModelListItem) => void;
}

function createModelChoice(): ModelChoice {
	let chosen: ImageModelListItem | undefined;
	return {
		getChosen: () => chosen,
		handleChoose(model): void {
			chosen = model;
		},
	};
}

function createCatalog(
	{ history, ...prices }: ModelBrowserInput,
	shippedExamples: ReadonlyMap<string, ModelExample>,
): ModelCatalog {
	const store = getHistoryStore();
	const yourExamples = getModelExamples(history, (stored) => store.resolve(stored));
	return { ...prices, shippedExamples, yourExamples };
}

function createServices(choice: ModelChoice, previews: PreviewCache | undefined): ModelBrowserServices {
	return {
		chooseModel: choice.handleChoose,
		getPreview: (path, box) => previews?.getPreview(path, box),
	};
}

/**
 * Opens the full-screen model browser, showing the newest image you made
 * with each model, or the example shipped with darkroom. Choosing a model
 * with Enter closes it and starts a guided session with that model, which
 * confirms the estimated cost before anything is spent.
 *
 * @param input - The models, what they cost, and past runs.
 * @param sort - The order the list opens in.
 * @rejects Whatever the session rejects with.
 */
export async function browseModelsAsync(input: ModelBrowserInput, sort: ModelSort): Promise<void> {
	const [previews, shippedExamples] = await Promise.all([createTerminalPreviewsAsync(), readShippedExamplesAsync()]);
	const choice = createModelChoice();
	const catalog = createCatalog(input, shippedExamples);
	const openedAt = new Date();
	const instance = render(
		<ModelBrowserScreen catalog={catalog} now={openedAt} services={createServices(choice, previews)} sort={sort} />,
		{ alternateScreen: true },
	);
	await instance.waitUntilExit();
	previews?.dispose();

	const chosen = choice.getChosen();
	if (chosen === undefined) return;

	const { runInteractiveSessionAsync } = await import("./interactive-session");
	await runInteractiveSessionAsync(chosen);
}
