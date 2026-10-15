import { ModelBrowser } from "./model-browser";

import type { ReactNode } from "react";
import type { Except } from "type-fest";

import type { ModelBrowserProviderProperties } from "./model-browser-provider";

export type ModelBrowserScreenProperties = Except<ModelBrowserProviderProperties, "children">;

/**
 * The full-screen model browser: models with their prices, the selected
 * model's details and your newest image from it, and a footer with the keys.
 *
 * @param properties - The models and what the keys act on.
 * @param properties.catalog - The models, what they cost, and your examples.
 * @param properties.now - When the browser opened, for naming days.
 * @param properties.services - Chooses a model and loads previews.
 * @param properties.sort - The order the list opens in.
 * @returns The whole screen, sized to the terminal.
 */
export function ModelBrowserScreen({
	catalog,
	now,
	services,
	sort,
}: Readonly<ModelBrowserScreenProperties>): ReactNode {
	return (
		<ModelBrowser.Provider catalog={catalog} now={now} services={services} sort={sort}>
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
