import { render } from "ink";

import { ModelBrowserScreen } from "./model-browser-screen";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ModelSort } from "$utilities/model-filters";

import type { ModelCatalog } from "./model-browser-state";

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

/**
 * Opens the full-screen model browser. Choosing a model with Enter closes it
 * and starts a guided session with that model, which confirms the estimated
 * cost before anything is spent.
 *
 * @param catalog - The models to browse and what they cost.
 * @param sort - The order the list opens in.
 * @rejects Whatever the session rejects with.
 */
export async function browseModelsAsync(catalog: ModelCatalog, sort: ModelSort): Promise<void> {
	const choice = createModelChoice();
	const instance = render(<ModelBrowserScreen catalog={catalog} sort={sort} onChoose={choice.handleChoose} />, {
		alternateScreen: true,
	});
	await instance.waitUntilExit();

	const chosen = choice.getChosen();
	if (chosen === undefined) return;

	const { runInteractiveSessionAsync } = await import("./interactive-session");
	await runInteractiveSessionAsync(chosen);
}
