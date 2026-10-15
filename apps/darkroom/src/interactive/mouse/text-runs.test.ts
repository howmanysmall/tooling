import { describe, it } from "vitest";

import { findTextRuns, getCellKind } from "./text-runs";

import type { SelectionSpan } from "./text-selection";

/**
 * Finds the runs in a row of characters, one per cell, where `_` is the
 * right half of the wide character before it.
 *
 * @param row - The row's cells.
 * @param span - The part of the row to look in.
 * @returns The runs of text.
 */
function findRuns(row: string, span: SelectionSpan): Array<SelectionSpan> {
	const cells = Array.from(new Intl.Segmenter().segment(row), ({ segment }) => segment);
	return findTextRuns(span, (column) => {
		const chars = cells[column] ?? " ";
		return chars === "_" ? getCellKind("", 0) : getCellKind(chars, 1);
	});
}

describe("findTextRuns", () => {
	it("keeps single spaces in a run and splits at wide gaps and borders", ({ expect }) => {
		expect.assertions(1);

		expect(findRuns("│ a b   cd│ef ", { end: 14, row: 3, start: 0 })).toStrictEqual([
			{ end: 5, row: 3, start: 2 },
			{ end: 10, row: 3, start: 8 },
			{ end: 13, row: 3, start: 11 },
		]);
	});

	it("keeps a wide character whole and stops at the span's edges", ({ expect }) => {
		expect.assertions(2);

		expect(findRuns("猫_ cat", { end: 7, row: 0, start: 0 })).toStrictEqual([{ end: 6, row: 0, start: 0 }]);
		expect(findRuns("hello world", { end: 8, row: 0, start: 3 })).toStrictEqual([{ end: 8, row: 0, start: 3 }]);
	});

	it("finds nothing in blank cells or blocks", ({ expect }) => {
		expect.assertions(1);

		expect(findRuns("  ▀▄█  ", { end: 7, row: 0, start: 0 })).toStrictEqual([]);
	});

	it("leaves out a kitty image, whose placeholders only draw right as the app wrote them", ({ expect }) => {
		expect.assertions(1);

		const image = "\u{10EEEE}̅̅\u{10EEEE}̅̍";

		expect(findRuns(`${image} cat`, { end: 6, row: 0, start: 0 })).toStrictEqual([{ end: 6, row: 0, start: 3 }]);
	});
});
