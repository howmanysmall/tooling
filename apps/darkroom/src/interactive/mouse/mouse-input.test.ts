import { describe, it } from "vitest";

import { holdBackPartialReport, normalizeCtrlBackspace, takeKeyboardReply } from "./mouse-input";

describe("takeKeyboardReply", () => {
	it("takes the terminal's answer out of the typing, so it is never typed", ({ expect }) => {
		expect.assertions(2);

		expect(takeKeyboardReply("a\u001B[?0ub")).toStrictEqual({ hasReply: true, text: "ab" });
		expect(takeKeyboardReply("a\u001B[127;9ub")).toStrictEqual({ hasReply: false, text: "a\u001B[127;9ub" });
	});
});

describe("normalizeCtrlBackspace", () => {
	it("makes ctrl+backspace delete a word, and leaves backspace and alt+backspace", ({ expect }) => {
		expect.assertions(2);

		expect(normalizeCtrlBackspace("\b\b")).toBe("\u0017\u0017");
		expect(normalizeCtrlBackspace("\u007F\u001B\b\u001B\u007F")).toBe("\u007F\u001B\b\u001B\u007F");
	});
});

describe("holdBackPartialReport", () => {
	it("passes whole reports and typing through untouched", ({ expect }) => {
		expect.assertions(1);

		expect(holdBackPartialReport("a\u001B[<35;10;5Mb")).toStrictEqual({
			complete: "a\u001B[<35;10;5Mb",
			pending: "",
		});
	});

	it("holds back a report or keyboard reply cut off at the end, but not a lone Esc", ({ expect }) => {
		expect.assertions(3);

		expect(holdBackPartialReport("x\u001B[<35;1")).toStrictEqual({ complete: "x", pending: "\u001B[<35;1" });
		expect(holdBackPartialReport("a\u001B[?0")).toStrictEqual({ complete: "a", pending: "\u001B[?0" });
		expect(holdBackPartialReport("\u001B")).toStrictEqual({ complete: "\u001B", pending: "" });
	});
});
