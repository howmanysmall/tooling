import { use } from "react";

import { CatalogNotice } from "./catalog-notice";
import { ModelBrowserScreen } from "./model-browser-screen";

import type { ReactNode } from "react";

import type { ModelSort } from "$utilities/model-filters";

import type { CatalogLoad } from "./app-catalog";
import type { ModelBrowserServices } from "./model-browser-services";

export interface ModelsTabProperties {
	catalog: Promise<CatalogLoad>;
	now: Date;
	services: ModelBrowserServices;
	sort: ModelSort;
}

/**
 * The models tab: the model browser once the models have loaded, or why
 * they couldn't. The app's Suspense boundary covers the wait.
 *
 * @param properties - The loading models and what the browser needs.
 * @param properties.catalog - Resolves to the models or an error.
 * @param properties.now - When the app opened, for naming days.
 * @param properties.services - Chooses a model and loads previews.
 * @param properties.sort - The order the list opens in.
 * @returns The tab's screen.
 */
export function ModelsTab({ catalog, now, services, sort }: Readonly<ModelsTabProperties>): ReactNode {
	const loaded = use(catalog);
	if ("error" in loaded) return <CatalogNotice isError={true} message={loaded.error} title="models" />;

	return <ModelBrowserScreen catalog={loaded.catalog} now={now} services={services} sort={sort} />;
}
