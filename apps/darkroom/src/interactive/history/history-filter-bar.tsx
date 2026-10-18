import { FilterInput } from "$interactive/components/filter-input";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

/**
 * The footer while filtering runs by prompt or model.
 *
 * @returns The filter input.
 */
export function HistoryFilterBar(): ReactNode {
	const { actions, state } = useHistoryBrowser();

	function handleFilterChange(text: string): void {
		actions.setFilter(text);
	}

	function handleFilterSubmit(): void {
		actions.closeFilter();
	}

	return (
		<FilterInput
			initialValue={state.filter}
			placeholder="filter by prompt or model"
			onChange={handleFilterChange}
			onSubmit={handleFilterSubmit}
		/>
	);
}
