import { render } from "ink";

import { getHistoryStore } from "$generation/cli-runner";

import { ModelBrowserScreen } from "./model-browser-screen";
import { getModelExamples } from "./model-examples";
import { createTerminalPreviewsAsync } from "./terminal-previews";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrices } from "$generation/observed-prices";
import type { HistoryEntry } from "$history/history-entry";
import type { PreviewCache } from "$preview/preview-cache";
import type { ModelSort } from "$utilities/model-filters";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { ModelBrowserServices } from "./model-browser-services";
import type { ModelCatalog } from "./model-browser-state";

export interface ModelBrowserInput {
	/** Past runs, for each model's newest image. */
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

function createCatalog({ history, ...prices }: ModelBrowserInput): ModelCatalog {
	return { ...prices, examples: getModelExamples(history) };
}

function createServices(choice: ModelChoice, previews: PreviewCache | undefined): ModelBrowserServices {
	const store = getHistoryStore();
	return {
		chooseModel: choice.handleChoose,
		getPreview: (stored, box) => previews?.getPreview(store.resolve(stored), box),
	};
}

/**
 * Opens the full-screen model browser, showing the newest image you made
 * with each model. Choosing a model with Enter closes it and starts a guided
 * session with that model, which confirms the estimated cost before anything
 * is spent.
 *
 * @param input - The models, what they cost, and past runs.
 * @param sort - The order the list opens in.
 * @rejects Whatever the session rejects with.
 */
export async function browseModelsAsync(input: ModelBrowserInput, sort: ModelSort): Promise<void> {
	const previews = await createTerminalPreviewsAsync();
	const choice = createModelChoice();
	const catalog = createCatalog(input);
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
