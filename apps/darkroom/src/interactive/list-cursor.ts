/** How a key, a click, or the wheel moves the cursor through a list. */
export type CursorMove =
	| { readonly delta: number; readonly type: "move" }
	| { readonly index: number; readonly type: "to" }
	| { readonly type: "first" }
	| { readonly type: "last" };

const CURSOR_MOVES: ReadonlySet<string> = new Set(["first", "last", "move", "to"]);

/**
 * Tells cursor moves from a browser's other actions.
 *
 * @param action - Any browser action.
 * @returns Whether it moves the cursor.
 */
export function isCursorMove(action: { readonly type: string }): action is CursorMove {
	return CURSOR_MOVES.has(action.type);
}

function getTarget(cursor: number, move: CursorMove, count: number): number {
	if (move.type === "move") return cursor + move.delta;
	if (move.type === "to") return move.index;
	return move.type === "last" ? count - 1 : 0;
}

/**
 * Keeps a cursor on a row that exists.
 *
 * @param cursor - The wanted index.
 * @param count - How many rows there are.
 * @returns The nearest valid index, or `0` for an empty list.
 */
export function clampCursor(cursor: number, count: number): number {
	return Math.max(0, Math.min(cursor, count - 1));
}

/**
 * Moves a cursor by a step, to a row, or to either end.
 *
 * @param cursor - The current index.
 * @param move - The step, the row, or `first` or `last`.
 * @param count - How many rows there are.
 * @returns The new index, kept within the list.
 */
export function moveCursor(cursor: number, move: CursorMove, count: number): number {
	return clampCursor(getTarget(cursor, move, count), count);
}

/**
 * Works out the first row to show so the cursor stays in view, keeping it
 * near the middle while there is room.
 *
 * @param cursor - The selected index.
 * @param count - How many rows there are.
 * @param height - How many rows fit.
 * @returns The index of the first visible row.
 */
export function getWindowStart(cursor: number, count: number, height: number): number {
	if (height <= 0 || count <= height) return 0;
	return Math.max(0, Math.min(cursor - Math.floor(height / 2), count - height));
}
