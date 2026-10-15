import { ModelSort } from "$utilities/model-filters";

import { useModelBrowser } from "./model-browser-context";
import { ScreenHeader } from "./screen-header";

import type { ReactNode } from "react";

const SORT_LABELS: ReadonlyMap<ModelSort, string> = new Map([
	[ModelSort.Created, "newest first"],
	[ModelSort.Name, "by name"],
	[ModelSort.Price, "cheapest first"],
]);

/**
 * The top line: the brand, how many models are shown, and their order.
 *
 * @returns `◐ darkroom models` and `48 models · cheapest first`.
 */
export function ModelBrowserHeader(): ReactNode {
	const { state } = useModelBrowser();
	const shown = state.models.length;
	const counts = state.filter.length === 0 ? `${shown} models` : `${shown} of ${state.total} models`;

	return <ScreenHeader summary={`${counts} · ${SORT_LABELS.get(state.sort) ?? state.sort}`} title="models" />;
}
