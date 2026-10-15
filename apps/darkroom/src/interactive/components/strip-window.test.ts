import { describe, it } from "vitest";

import { getStripWindow } from "./strip-window";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g"];

describe("getStripWindow", () => {
	it("shows everything when it fits", ({ expect }) => {
		expect.assertions(1);

		expect(getStripWindow(LETTERS, 3, 10)).toStrictEqual({ after: 0, before: 0, shown: LETTERS });
	});

	it("centers the selected item and counts the hidden ones on each side", ({ expect }) => {
		expect.assertions(1);

		expect(getStripWindow(LETTERS, 3, 3)).toStrictEqual({ after: 2, before: 2, shown: ["c", "d", "e"] });
	});

	it("always shows at least the selected item", ({ expect }) => {
		expect.assertions(1);

		expect(getStripWindow(LETTERS, 6, 0)).toStrictEqual({ after: 0, before: 6, shown: ["g"] });
	});
});
