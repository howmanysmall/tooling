import { useReducer } from "react";
import { useInput } from "ink";

import { INITIAL_PALETTE_STATE, reducePaletteState } from "./command-palette-state";
import { getWindowStart } from "./list-cursor";

/**
 * A searchable dialog's list: the matches, the cursor, and the window.
 *
 * @template Item - What the list holds.
 */
export interface SearchList<Item> {
	readonly cursor: number;
	/** Narrows the list to a new query, for the search input. */
	readonly handleQueryChange: (query: string) => void;
	/** Moves the cursor: `1` for the wheel down, `-1` for up. */
	readonly handleWheel: (delta: number) => void;
	/** Every match for the query, best first. */
	readonly matches: ReadonlyArray<Item>;
	/** Puts the cursor on a match, as the pointer moving onto it does. */
	readonly pointAt: (index: number) => void;
	/** The match under the cursor, if any. */
	readonly selected: Item | undefined;
	/** Index of the first match in view. */
	readonly start: number;
	/** The matches in view, which keep the cursor in sight. */
	readonly visible: ReadonlyArray<Item>;
}

/**
 * Runs a searchable dialog's list: typing narrows it, ↑↓ and the wheel
 * move through it, the pointer chooses the row it is over, and Esc closes
 * the dialog. The search input reads the typing and Enter.
 *
 * @template Item - What the list holds.
 * @param findMatches - The items that match a query, best first.
 * @param visibleRows - How many rows fit.
 * @param onClose - Closes the dialog.
 * @returns The list and how to move through it.
 */
export function useSearchList<Item>(
	findMatches: (query: string) => ReadonlyArray<Item>,
	visibleRows: number,
	onClose: () => void,
): SearchList<Item> {
	const [state, dispatch] = useReducer(reducePaletteState, INITIAL_PALETTE_STATE);
	const matches = findMatches(state.query);
	const count = matches.length;
	const start = getWindowStart(state.cursor, count, visibleRows);

	function handleWheel(delta: number): void {
		dispatch({ count, move: { delta, type: "move" }, type: "move" });
	}

	useInput(function onSearchListInput(_input, key) {
		if (key.escape) onClose();
		else if (key.upArrow) handleWheel(-1);
		else if (key.downArrow) handleWheel(1);
	});

	return {
		cursor: state.cursor,
		handleQueryChange(query): void {
			dispatch({ query, type: "query" });
		},
		handleWheel,
		matches,
		pointAt(index): void {
			dispatch({ count, move: { index, type: "to" }, type: "move" });
		},
		selected: matches[state.cursor],
		start,
		visible: matches.slice(start, start + visibleRows),
	};
}
