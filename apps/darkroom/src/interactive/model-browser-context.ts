import { createContext, use } from "react";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ModelPrices } from "$generation/observed-prices";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";
import type { ModelSort } from "$utilities/model-filters";

import type { ModelExample } from "./model-examples";
import type { StatusMessage } from "./status-message";

/** What the parts see of the browser's state. */
export interface ModelBrowserView {
	/** Text the name, ID, or description must contain; empty when unfiltered. */
	readonly filter: string;
	readonly isFiltering: boolean;
	/** The models that match the filter, in the chosen order. */
	readonly models: ReadonlyArray<ImageModelListItem>;
	/** The model under the cursor, if any. */
	readonly selected?: ImageModelListItem | undefined;
	/** Index of `selected` within `models`. */
	readonly selectedIndex: number;
	readonly sort: ModelSort;
	/** A one-line message for the footer, such as a copied ID. */
	readonly status?: StatusMessage | undefined;
	/** How many models there are, filtered or not. */
	readonly total: number;
}

export interface ModelBrowserActions {
	readonly cancelFilter: () => void;
	/** Closes the browser and starts a session with the selected model. */
	readonly chooseSelected: () => void;
	readonly closeFilter: () => void;
	readonly copySelected: () => void;
	readonly cycleSort: () => void;
	readonly moveDown: () => void;
	readonly movePageDown: () => void;
	readonly movePageUp: () => void;
	readonly moveToFirst: () => void;
	readonly moveToLast: () => void;
	readonly moveUp: () => void;
	readonly openFilter: () => void;
	readonly quit: () => void;
	readonly setFilter: (text: string) => void;
	/** Flips between your image and the shipped example. */
	readonly switchExample: () => void;
}

export interface ModelBrowserLayout {
	readonly columns: number;
	/** Rows of models the list can show. */
	readonly listHeight: number;
	readonly listWidth: number;
	/** The most cells an example image may use. */
	readonly previewBox: CellBox;
	readonly rows: number;
}

export interface ModelBrowserMeta {
	/** Whether a model has both your image and a shipped example. */
	readonly canSwitchExample: (model: ImageModelListItem) => boolean;
	/** The image to show for a model: yours, or the shipped example. */
	readonly getExample: (model: ImageModelListItem) => ModelExample | undefined;
	/** An example's image, sized for the detail pane. */
	readonly getPreview: (example: ModelExample) => LoadingPreview | undefined;
	/** A model's published prices, and what it has cost in past runs. */
	readonly getPrices: (model: ImageModelListItem) => ModelPrices;
	readonly layout: ModelBrowserLayout;
	/** When the browser opened, for naming days like `Today`. */
	readonly now: Date;
}

/**
 * What every model browser part reads. The provider is the only place that
 * knows how the state is kept.
 */
export interface ModelBrowserContextValue {
	readonly actions: ModelBrowserActions;
	readonly meta: ModelBrowserMeta;
	readonly state: ModelBrowserView;
}

export const ModelBrowserContext = createContext<ModelBrowserContextValue | undefined>(undefined);
ModelBrowserContext.displayName = "ModelBrowserContext";

/**
 * Reads the model browser's state, actions, and layout.
 *
 * @returns The context value from the nearest provider.
 * @throws {Error} When used outside `ModelBrowser.Provider`.
 */
export function useModelBrowser(): ModelBrowserContextValue {
	const value = use(ModelBrowserContext);
	if (value === undefined) {
		throw new Error("useModelBrowser must be used inside ModelBrowser.Provider.");
	}

	return value;
}
