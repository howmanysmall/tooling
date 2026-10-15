import { FilterInput } from "$interactive/components/filter-input";

import { useModelBrowser } from "./model-browser-context";

import type { ReactNode } from "react";

/**
 * The status bar's left side while filtering models by name, ID, or
 * description.
 *
 * @returns The filter input.
 */
export function ModelFilterBar(): ReactNode {
	const { actions, state } = useModelBrowser();

	function handleFilterChange(text: string): void {
		actions.setFilter(text);
	}

	function handleFilterSubmit(): void {
		actions.closeFilter();
	}

	return (
		<FilterInput
			initialValue={state.filter}
			placeholder="filter by name, ID, or description"
			onChange={handleFilterChange}
			onSubmit={handleFilterSubmit}
		/>
	);
}
