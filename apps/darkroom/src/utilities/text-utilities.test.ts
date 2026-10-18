import { describe, it } from "vitest";

import { removeControlCharacters } from "./text-utilities";

describe("removeControlCharacters", () => {
	it("drops Ctrl-A and Ctrl-E left behind by a terminal prompt", ({ expect }) => {
		expect.assertions(1);

		expect(removeControlCharacters("A very c\u0005\u0005ool guy.\u0001")).toBe("A very cool guy.");
	});

	it("keeps newlines, tabs, and non-ASCII text", ({ expect }) => {
		expect.assertions(1);

		expect(removeControlCharacters("line one\n\tcafé · 猫\u007F")).toBe("line one\n\tcafé · 猫");
	});
});
