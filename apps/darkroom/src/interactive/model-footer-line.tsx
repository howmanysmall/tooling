import { FilterInput } from "./filter-input";
import { KeyHints } from "./key-hints";
import { useModelBrowser } from "./model-browser-context";
import { StatusText } from "./status-text";

import type { ReactNode } from "react";

import type { KeyHint } from "./key-hints";

const KEY_HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "move"],
	["/", "filter"],
	["s", "sort"],
	["⏎", "generate"],
	["y", "copy id"],
	["q", "quit"],
];

/**
 * Picks the footer for the current mode: the filter while filtering,
 * otherwise the last outcome or the keys.
 *
 * @returns One line.
 */
export function ModelFooterLine(): ReactNode {
	const { actions, state } = useModelBrowser();

	function handleFilterChange(text: string): void {
		actions.setFilter(text);
	}

	function handleFilterSubmit(): void {
		actions.closeFilter();
	}

	if (state.isFiltering) {
		return (
			<FilterInput
				initialValue={state.filter}
				placeholder="filter by name, ID, or description"
				onChange={handleFilterChange}
				onSubmit={handleFilterSubmit}
			/>
		);
	}

	return state.status === undefined ? <KeyHints hints={KEY_HINTS} /> : <StatusText status={state.status} />;
}
