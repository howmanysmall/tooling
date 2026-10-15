import { MouseAction } from "./mouse-input";

import type { PointerEvent } from "./mouse-input";

/** A cell on screen, zero-based. */
export interface CellPoint {
	readonly column: number;
	readonly row: number;
}

/** The selected cells of one screen row; `end` is not included. */
export interface SelectionSpan {
	readonly end: number;
	readonly row: number;
	readonly start: number;
}

function comesFirst(left: CellPoint, right: CellPoint): boolean {
	return left.row < right.row || (left.row === right.row && left.column <= right.column);
}

/**
 * Works out the cells between two points in reading order, the way a
 * terminal selects: the rest of the first row, every row between, and the
 * start of the last row.
 *
 * @param anchor - Where the drag started.
 * @param head - Where the pointer is now.
 * @param columns - How wide the screen is.
 * @returns One span per row, top to bottom.
 */
export function getSelectionSpans(anchor: CellPoint, head: CellPoint, columns: number): Array<SelectionSpan> {
	const [from, to] = comesFirst(anchor, head) ? [anchor, head] : [head, anchor];
	const { column: firstColumn, row: firstRow } = from;
	const { column: lastColumn, row: lastRow } = to;
	const spans: Array<SelectionSpan> = [];
	for (let row = firstRow; row <= lastRow; row += 1) {
		const start = row === firstRow ? firstColumn : 0;
		const end = row === lastRow ? lastColumn + 1 : columns;
		spans.push({ end: Math.min(end, columns), row, start });
	}
	return spans;
}

export interface TextSelectionScreen {
	/** Narrows spans to the runs of text in them, leaving out the rest. */
	readonly findText: (spans: ReadonlyArray<SelectionSpan>) => Array<SelectionSpan>;
	/** How wide the screen is now. */
	readonly getColumns: () => number;
	/** Draws cells highlighted, or as they are when `isHighlighted` is off. */
	readonly paint: (spans: ReadonlyArray<SelectionSpan>, isHighlighted: boolean) => void;
	/** The text in runs from `findText`, one line per row. */
	readonly readText: (runs: ReadonlyArray<SelectionSpan>) => string;
}

export interface TextSelection {
	/**
	 * Takes a pointer event.
	 *
	 * @returns Whether the event belongs to a drag that selects text, so a
	 *   button press it started must not click.
	 */
	readonly handle: (event: PointerEvent) => boolean;
	/** Draws the highlight again after the app redrew the screen under it. */
	readonly repaint: () => void;
}

function isSamePoint(left: CellPoint, right: CellPoint): boolean {
	return left.column === right.column && left.row === right.row;
}

/**
 * Lets a drag select text on screen, as in a terminal without mouse
 * reporting: the cells light up while the button is held, and the text is
 * copied when it comes up. A press and release in one place is a click.
 *
 * @param screen - Reads and draws the cells.
 * @param copy - Takes the selected text.
 * @returns The selection, which takes every pointer event.
 */
export function createTextSelection(screen: TextSelectionScreen, copy: (text: string) => void): TextSelection {
	let anchor: CellPoint | undefined;
	// The cells the drag covers, and the text in them, which lights up.
	let spans: ReadonlyArray<SelectionSpan> = [];
	let runs: ReadonlyArray<SelectionSpan> = [];

	function highlightText(): void {
		runs = screen.findText(spans);
		screen.paint(runs, true);
	}

	function drag(point: CellPoint): boolean {
		if (anchor === undefined) return false;
		if (spans.length === 0 && isSamePoint(anchor, point)) return false;

		screen.paint(runs, false);
		spans = getSelectionSpans(anchor, point, screen.getColumns());
		highlightText();
		return true;
	}

	function release(): boolean {
		anchor = undefined;
		if (spans.length === 0) return false;

		const text = screen.readText(runs);
		screen.paint(runs, false);
		spans = [];
		runs = [];
		if (text !== "") copy(text);
		return true;
	}

	return {
		handle(event): boolean {
			if (event.action === MouseAction.Press) {
				anchor = { column: event.column, row: event.row };
				return false;
			}
			if (event.action === MouseAction.Drag) return drag(event);
			if (event.action === MouseAction.Release) return release();
			return false;
		},
		repaint(): void {
			// The text under the drag may have moved.
			if (spans.length > 0) highlightText();
		},
	};
}
