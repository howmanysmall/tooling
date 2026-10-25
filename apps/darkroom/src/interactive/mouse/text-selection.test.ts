import { describe, it } from "vitest";

import { MouseAction } from "./mouse-input";
import { createTextSelection, getSelectionSpans } from "./text-selection";

import type { SelectionSpan, TextSelectionScreen } from "./text-selection";

describe("getSelectionSpans", () => {
	it("selects in reading order across rows, whichever way the drag went", ({ expect }) => {
		expect.assertions(2);

		const spans = [
			{ end: 10, row: 1, start: 4 },
			{ end: 10, row: 2, start: 0 },
			{ end: 3, row: 3, start: 0 },
		];

		expect(getSelectionSpans({ column: 4, row: 1 }, { column: 2, row: 3 }, 10)).toStrictEqual(spans);
		expect(getSelectionSpans({ column: 2, row: 3 }, { column: 4, row: 1 }, 10)).toStrictEqual(spans);
	});

	it("selects within one row from the left point to the right one", ({ expect }) => {
		expect.assertions(1);

		expect(getSelectionSpans({ column: 7, row: 0 }, { column: 3, row: 0 }, 10)).toStrictEqual([
			{ end: 8, row: 0, start: 3 },
		]);
	});
});

interface FakeScreen extends TextSelectionScreen {
	/** What is highlighted now, by row. */
	readonly highlighted: Map<number, SelectionSpan>;
}

/**
 * A screen whose rows read `row 0`, `row 1`, and so on, in the first five
 * columns, which tracks what is highlighted.
 *
 * @returns A screen that reads those rows and records what is lit.
 */
function createFakeScreen(): FakeScreen {
	const highlighted = new Map<number, SelectionSpan>();
	return {
		findText: (spans) =>
			spans.flatMap(({ end, row, start }) => (start < 5 ? [{ end: Math.min(end, 5), row, start }] : [])),
		getColumns: () => 10,
		highlighted,
		paint(spans, isHighlighted): void {
			for (const span of spans) {
				if (isHighlighted) {
					highlighted.set(span.row, span);
				} else {
					highlighted.delete(span.row);
				}
			}
		},
		readText: (runs) => runs.map(({ end, row, start }) => `row ${row}`.slice(start, end)).join("\n"),
	};
}

describe("createTextSelection", () => {
	it("highlights while dragging, then copies the text and clears the highlight", ({ expect }) => {
		expect.assertions(5);

		const screen = createFakeScreen();
		const copied: Array<string> = [];
		const selection = createTextSelection(screen, (text) => {
			copied.push(text);
		});

		expect(selection.handle({ action: MouseAction.Press, column: 0, row: 1 })).toBe(false);
		expect(selection.handle({ action: MouseAction.Drag, column: 2, row: 2 })).toBe(true);
		expect([...screen.highlighted.keys()]).toStrictEqual([1, 2]);

		selection.handle({ action: MouseAction.Release, column: 2, row: 2 });

		expect(copied).toStrictEqual(["row 1\nrow"]);
		expect(screen.highlighted.size).toBe(0);
	});

	it("leaves a click alone, and copies nothing from blank cells", ({ expect }) => {
		expect.assertions(3);

		const screen = createFakeScreen();
		const copied: Array<string> = [];
		const selection = createTextSelection(screen, (text) => {
			copied.push(text);
		});

		selection.handle({ action: MouseAction.Press, column: 3, row: 0 });
		selection.handle({ action: MouseAction.Drag, column: 3, row: 0 });

		expect(selection.handle({ action: MouseAction.Release, column: 3, row: 0 })).toBe(false);

		selection.handle({ action: MouseAction.Press, column: 7, row: 0 });
		selection.handle({ action: MouseAction.Drag, column: 9, row: 0 });

		expect(selection.handle({ action: MouseAction.Release, column: 9, row: 0 })).toBe(true);
		expect(copied).toStrictEqual([]);
	});

	it("draws the highlight again after the screen redraws", ({ expect }) => {
		expect.assertions(1);

		const screen = createFakeScreen();
		const selection = createTextSelection(screen, () => undefined);
		selection.handle({ action: MouseAction.Press, column: 0, row: 0 });
		selection.handle({ action: MouseAction.Drag, column: 4, row: 0 });
		// The app redraws, which wipes the highlight.
		screen.highlighted.clear();
		selection.repaint();

		expect(screen.highlighted.get(0)).toStrictEqual({ end: 5, row: 0, start: 0 });
	});
});
