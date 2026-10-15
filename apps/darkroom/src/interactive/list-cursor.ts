/** How a key moves the cursor through a list. */
export type CursorMove =
	| { readonly delta: number; readonly type: "move" }
	| { readonly type: "first" }
	| { readonly type: "last" };

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
 * Moves a cursor by a step, or to either end.
 *
 * @param cursor - The current index.
 * @param move - The step, or `first` or `last`.
 * @param count - How many rows there are.
 * @returns The new index, kept within the list.
 */
export function moveCursor(cursor: number, move: CursorMove, count: number): number {
	const target = move.type === "move" ? cursor + move.delta : 0;
	return clampCursor(move.type === "last" ? count - 1 : target, count);
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
