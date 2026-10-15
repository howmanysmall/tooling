import { ModelBrowser } from "./model-browser";

import type { ReactNode } from "react";
import type { Except } from "type-fest";

import type { ModelBrowserProviderProperties } from "./model-browser-provider";

export type ModelBrowserScreenProperties = Except<ModelBrowserProviderProperties, "children">;

/**
 * The full-screen model browser: models with their prices, the selected
 * model's details, and a footer with the keys.
 *
 * @param properties - The models and what Enter does.
 * @param properties.catalog - The models to browse and what they cost.
 * @param properties.onChoose - Takes the model chosen with Enter.
 * @param properties.sort - The order the list opens in.
 * @returns The whole screen, sized to the terminal.
 */
export function ModelBrowserScreen({ catalog, onChoose, sort }: Readonly<ModelBrowserScreenProperties>): ReactNode {
	return (
		<ModelBrowser.Provider catalog={catalog} sort={sort} onChoose={onChoose}>
			<ModelBrowser.Frame>
				<ModelBrowser.Header />
				<ModelBrowser.Panes>
					<ModelBrowser.List />
					<ModelBrowser.Detail />
				</ModelBrowser.Panes>
				<ModelBrowser.Footer />
			</ModelBrowser.Frame>
		</ModelBrowser.Provider>
	);
}
