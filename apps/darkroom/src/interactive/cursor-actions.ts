import type { CursorMove } from "./list-cursor";

/** The keys that move a browser's cursor. */
export interface CursorActions {
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
 * Builds the cursor movements every browser shares.
 *
 * @param dispatch - Sends a movement to the browser's reducer.
 * @param pageSize - Rows a page holds.
 * @returns The movement actions.
 */
export function createCursorActions(dispatch: (move: CursorMove) => void, pageSize: number): CursorActions {
	return {
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
