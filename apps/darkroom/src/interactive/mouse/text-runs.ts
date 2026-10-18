import type { SelectionSpan } from "./text-selection";

/** How a selection treats a cell. */
export const enum CellKind {
	/** Empty, or a space. */
	Blank = 0,
	/** The right half of a wide character, which goes with its left half. */
	Continuation = 1,
	/**
	 * A border, the logo, or part of an image preview: a half block, or a
	 * kitty placeholder, which only draws right with the diacritics the app
	 * wrote, so a selection must never redraw it.
	 */
	Graphic = 2,
	Text = 3,
}

// Box drawing and block elements: borders, half-block images, the logo.
const GRAPHIC = /^[\u2500-\u259F]+$/u;
// Kitty's image placeholder, followed by the diacritics for its row and column.
const KITTY_PLACEHOLDER = "\u{10EEEE}";

/**
 * Sorts a cell by what it shows.
 *
 * @param chars - The cell's characters.
 * @param width - How many columns it takes; 0 for the right half of a wide
 *   character.
 * @returns What a selection makes of it.
 */
export function getCellKind(chars: string, width: number): CellKind {
	if (width === 0) return CellKind.Continuation;
	if (chars.trim().length === 0) return CellKind.Blank;
	return GRAPHIC.test(chars) || chars.startsWith(KITTY_PLACEHOLDER) ? CellKind.Graphic : CellKind.Text;
}

/**
 * Narrows a span to the text in it, the way opencode selects: words and the
 * single spaces between them light up, while padding, wide gaps, borders,
 * and images don't.
 *
 * @param span - The cells a drag covers on one row.
 * @param span.end - Where it ends, not included.
 * @param span.row - Which screen row, from the top.
 * @param span.start - Where it starts.
 * @param getKind - What the cell at a column shows.
 * @returns The runs of text in the span, left to right.
 */
export function findTextRuns(
	{ end, row, start }: SelectionSpan,
	getKind: (column: number) => CellKind,
): Array<SelectionSpan> {
	const kinds = getKinds(start, end, getKind);
	const runs: Array<SelectionSpan> = [];
	let index = 0;
	while (index < kinds.length) {
		if (kinds[index] === CellKind.Text) {
			const runEnd = findRunEnd(kinds, index);
			runs.push({ end: start + runEnd, row, start: start + index });
			index = runEnd;
		} else index += 1;
	}
	return runs;
}

/**
 * Reads what each cell shows, where the right half of a wide character
 * takes after its left half.
 *
 * @param start - The first column.
 * @param end - The column after the last.
 * @param getKind - What the cell at a column shows.
 * @returns The kind of each column from `start`, never `Continuation`.
 */
function getKinds(start: number, end: number, getKind: (column: number) => CellKind): Array<CellKind> {
	const kinds: Array<CellKind> = [];
	for (let column = start; column < end; column += 1) {
		const kind = getKind(column);
		kinds.push(kind === CellKind.Continuation ? (kinds.at(-1) ?? CellKind.Blank) : kind);
	}
	return kinds;
}

function isWordGap(kinds: ReadonlyArray<CellKind>, index: number): boolean {
	return kinds[index] === CellKind.Blank && kinds[index + 1] === CellKind.Text;
}

/**
 * Follows a run of text over the single spaces between its words.
 *
 * @param kinds - What each cell shows.
 * @param from - A cell with text.
 * @returns The index after the run's last cell.
 */
function findRunEnd(kinds: ReadonlyArray<CellKind>, from: number): number {
	let end = from + 1;
	while (kinds[end] === CellKind.Text || isWordGap(kinds, end)) end += 1;
	return end;
}
