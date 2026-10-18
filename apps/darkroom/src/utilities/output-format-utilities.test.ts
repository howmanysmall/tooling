import { describe, it } from "vitest";

import { trimTrailingSpaces, wrapText } from "./output-format-utilities";

describe("wrapText", () => {
	it("breaks text at spaces so no line is wider than the limit", ({ expect }) => {
		expect.assertions(1);

		expect(wrapText("a cat in a very tall hat", 10)).toStrictEqual(["a cat in a", "very tall", "hat"]);
	});

	it("keeps a word longer than the limit on its own line", ({ expect }) => {
		expect.assertions(1);

		expect(wrapText("tiny enormousword tiny", 6)).toStrictEqual(["tiny", "enormousword", "tiny"]);
	});

	it("ignores colour codes when measuring width", ({ expect }) => {
		expect.assertions(1);

		expect(wrapText("\u001B[32mgreen\u001B[39m words", 11)).toStrictEqual(["\u001B[32mgreen\u001B[39m words"]);
	});
});

describe("trimTrailingSpaces", () => {
	it("removes padding at line ends only", ({ expect }) => {
		expect.assertions(1);

		expect(trimTrailingSpaces("a  b  \nc    ")).toBe("a  b\nc");
	});
});
