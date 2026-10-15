import { describe, it } from "vitest";

import { MouseAction, splitMouseInput, toMouseAction } from "./mouse-input";

describe("splitMouseInput", () => {
	it("takes the reports out and leaves the typing, in zero-based cells", ({ expect }) => {
		expect.assertions(1);

		// The right button's press is dropped.
		expect(splitMouseInput("a\u001B[<35;10;5Mb\u001B[<2;1;1M\u001B[<0;3;2M\u001B[<0;3;2mc")).toStrictEqual({
			events: [
				{ action: MouseAction.Move, column: 9, row: 4 },
				{ action: MouseAction.Press, column: 2, row: 1 },
				{ action: MouseAction.Release, column: 2, row: 1 },
			],
			pending: "",
			text: "abc",
		});
	});

	it("holds back a report cut off at the end, but not a lone Esc", ({ expect }) => {
		expect.assertions(2);

		expect(splitMouseInput("x\u001B[<35;1")).toStrictEqual({ events: [], pending: "\u001B[<35;1", text: "x" });
		expect(splitMouseInput("\u001B")).toStrictEqual({ events: [], pending: "", text: "\u001B" });
	});
});

describe("toMouseAction", () => {
	it("reads the wheel, motion, and the primary button, and skips the rest", ({ expect }) => {
		expect.assertions(7);

		expect(toMouseAction(64, false)).toBe(MouseAction.WheelUp);
		expect(toMouseAction(65, false)).toBe(MouseAction.WheelDown);
		expect(toMouseAction(35, false)).toBe(MouseAction.Move);
		expect(toMouseAction(32, false)).toBe(MouseAction.Drag);
		expect(toMouseAction(0, true)).toBe(MouseAction.Release);
		expect(toMouseAction(2, false)).toBeUndefined();
		expect(toMouseAction(2, true)).toBeUndefined();
	});
});
