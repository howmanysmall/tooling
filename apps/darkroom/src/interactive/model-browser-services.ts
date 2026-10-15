import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

/** What the model browser needs from outside: the session and previews. */
export interface ModelBrowserServices {
	/** Remembers the model to generate with once the browser has closed. */
	readonly chooseModel: (model: ImageModelListItem) => void;
	/**
	 * Loads a preview of an image in the history store, or `undefined` when
	 * previews are off.
	 */
	readonly getPreview: (stored: string, box: CellBox) => LoadingPreview | undefined;
}
