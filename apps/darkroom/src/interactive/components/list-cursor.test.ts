import { describe, it } from "vitest";

import { CursorMoveType, getWindowStart, moveCursor } from "./list-cursor";

describe("moveCursor", () => {
	it("steps, jumps to either end, and stays within the list", ({ expect }) => {
		expect.assertions(4);

		expect(moveCursor(2, { delta: 1, type: CursorMoveType.Move }, 5)).toBe(3);
		expect(moveCursor(2, { delta: -10, type: CursorMoveType.Move }, 5)).toBe(0);
		expect(moveCursor(0, { type: CursorMoveType.Last }, 5)).toBe(4);
		expect(moveCursor(3, { type: CursorMoveType.First }, 5)).toBe(0);
	});
});

describe("getWindowStart", () => {
	it("keeps the cursor near the middle without scrolling past either end", ({ expect }) => {
		expect.assertions(4);

		expect(getWindowStart(3, 5, 10)).toBe(0);
		expect(getWindowStart(1, 100, 10)).toBe(0);
		expect(getWindowStart(50, 100, 10)).toBe(45);
		expect(getWindowStart(99, 100, 10)).toBe(90);
	});
});
