import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

/**
 * The footer while filtering: a text input that filters as you type. Enter
 * keeps the filter; Esc clears it.
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
		<Box>
			<Text color="cyan">{"/ "}</Text>
			<TextInput
				defaultValue={state.filter}
				placeholder="filter by prompt or model"
				onChange={handleFilterChange}
				onSubmit={handleFilterSubmit}
			/>
		</Box>
	);
}
