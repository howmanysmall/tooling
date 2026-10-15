import { CommandGroup } from "./browser-command";
import { BrowserKey } from "./browser-keys";

import type { CursorMove } from "$interactive/components/list-cursor";

import type { BrowserCommand } from "./browser-command";

/** What a browser calls its rows, for the navigation commands' titles. */
export interface RowNames {
	/** The row `g` goes to, like `Newest run`. */
	readonly first: string;
	/** One row, like `run`. */
	readonly item: string;
	/** The row `G` goes to, like `Oldest run`. */
	readonly last: string;
}

/** The keys that move a browser's cursor. */
export interface CursorActions {
	/** Moves by rows, as the mouse wheel does: down for positive. */
	readonly moveBy: (delta: number) => void;
	readonly moveDown: () => void;
	readonly movePageDown: () => void;
	readonly movePageUp: () => void;
	readonly moveToFirst: () => void;
	readonly moveToLast: () => void;
	readonly moveUp: () => void;
}

const MOVE_DOWN: CursorMove = { delta: 1, type: "move" };
const MOVE_UP: CursorMove = { delta: -1, type: "move" };
const MOVE_FIRST: CursorMove = { type: "first" };
const MOVE_LAST: CursorMove = { type: "last" };

/**
 * The navigation commands every browser shares, for help to list.
 *
 * @param actions - The browser's cursor actions.
 * @param names - What the browser calls its rows.
 * @returns The movement commands with their keys.
 */
export function getNavigationCommands(actions: CursorActions, names: RowNames): Array<BrowserCommand> {
	const group = CommandGroup.Navigate;
	return [
		{ key: BrowserKey.Up, group, keyLabel: "↑ k", run: actions.moveUp, title: `Previous ${names.item}` },
		{ key: BrowserKey.Down, group, keyLabel: "↓ j", run: actions.moveDown, title: `Next ${names.item}` },
		{ key: BrowserKey.PageUp, group, keyLabel: "pgup", run: actions.movePageUp, title: "Page up" },
		{ key: BrowserKey.PageDown, group, keyLabel: "pgdn", run: actions.movePageDown, title: "Page down" },
		{ key: BrowserKey.First, group, keyLabel: "g", run: actions.moveToFirst, title: names.first },
		{ key: BrowserKey.Last, group, keyLabel: "G", run: actions.moveToLast, title: names.last },
	];
}

/**
 * Builds the cursor movements every browser shares.
 *
 * @param dispatch - Sends a movement to the browser's reducer.
 * @param pageSize - Rows a page holds.
 * @returns The movement actions.
 */
export function createCursorActions(dispatch: (move: CursorMove) => void, pageSize: number): CursorActions {
	return {
		moveBy(delta): void {
			dispatch({ delta, type: "move" });
		},
		moveDown(): void {
			dispatch(MOVE_DOWN);
		},
		movePageDown(): void {
			dispatch({ delta: pageSize, type: "move" });
		},
		movePageUp(): void {
			dispatch({ delta: -pageSize, type: "move" });
		},
		moveToFirst(): void {
			dispatch(MOVE_FIRST);
		},
		moveToLast(): void {
			dispatch(MOVE_LAST);
		},
		moveUp(): void {
			dispatch(MOVE_UP);
		},
	};
}
