import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { StatusBar } from "$interactive/components/status-bar";
import { ModelSort } from "$utilities/model-filters";

import { useModelBrowser } from "./model-browser-context";
import { getModelCommands } from "./model-commands";
import { ModelFilterBar } from "./model-filter-bar";

import type { ReactNode } from "react";

const SORT_LABELS: ReadonlyMap<ModelSort, string> = new Map([
	[ModelSort.Created, "newest first"],
	[ModelSort.Name, "by name"],
	[ModelSort.Price, "cheapest first"],
]);

/**
 * The bottom line: the main keys, or the filter while it is open, then how
 * many models are shown and in what order.
 *
 * @returns The model browser's status bar.
 */
export function ModelBrowserFooter(): ReactNode {
	const { actions, state } = useModelBrowser();
	const shown = state.models.length;
	const counts =
		state.filter.length === 0
			? `${shown} ${toPlural(shown, "model")}`
			: `${shown} of ${state.total} ${toPlural(state.total, "model")}`;
	const summary = `${counts} · ${SORT_LABELS.get(state.sort) ?? state.sort}`;

	return (
		<StatusBar commands={getModelCommands(actions)} summary={summary}>
			{state.isFiltering ? <ModelFilterBar /> : null}
		</StatusBar>
	);
}
