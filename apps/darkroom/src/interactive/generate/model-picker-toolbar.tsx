import { Box, Text } from "ink";

import { theme } from "$interactive/components/theme";

import { PICKER_FILTERS, PICKER_SORTS, PickerFilter, PickerSort } from "./model-picker-view";
import { PickerChip } from "./picker-chip";

import type { Dispatch, ReactNode } from "react";

import type { PickerView, PickerViewAction } from "./model-picker-view";

export interface ModelPickerToolbarProperties {
	/** Changes the sort or the filters. */
	dispatch: Dispatch<PickerViewAction>;
	view: PickerView;
}

const SORT_LABELS: Readonly<Record<PickerSort, string>> = {
	[PickerSort.Name]: "Name",
	[PickerSort.Newest]: "Newest",
	[PickerSort.Price]: "Price",
	[PickerSort.Recent]: "Recent",
};
const FILTER_LABELS: Readonly<Record<PickerFilter, string>> = {
	[PickerFilter.Edits]: "◧ Edits",
	[PickerFilter.Several]: "× Several",
	[PickerFilter.Transparent]: "◌ Transparent",
};

/**
 * The model picker's sort and filters as chips under its search line,
 * with the tokens the search line also takes.
 *
 * @param properties - The view and how to change it.
 * @param properties.dispatch - Changes the sort or the filters.
 * @param properties.view - The chosen sort and filters.
 * @returns Two rows of chips and a hint.
 */
export function ModelPickerToolbar({ dispatch, view }: Readonly<ModelPickerToolbarProperties>): ReactNode {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box columnGap={1}>
				<Box width={6}>
					<Text color={theme.muted}>{"Sort"}</Text>
				</Box>
				{PICKER_SORTS.map((sort) => (
					<PickerChip
						key={sort}
						isOn={view.sort === sort}
						label={SORT_LABELS[sort]}
						target={`picker-sort:${sort}`}
						onPress={(): void => {
							dispatch({ sort, type: "sort" });
						}}
					/>
				))}
			</Box>
			<Box columnGap={1}>
				<Box width={6}>
					<Text color={theme.muted}>{"Only"}</Text>
				</Box>
				{PICKER_FILTERS.map((filter) => (
					<PickerChip
						key={filter}
						isOn={view.filters.has(filter)}
						label={FILTER_LABELS[filter]}
						target={`picker-filter:${filter}`}
						onPress={(): void => {
							dispatch({ filter, type: "toggle-filter" });
						}}
					/>
				))}
			</Box>
			<Text color={theme.muted}>{"tab sorts · type @provider, $0.02 for a top price, or +edits"}</Text>
		</Box>
	);
}
