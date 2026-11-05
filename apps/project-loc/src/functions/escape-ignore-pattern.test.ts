import { describe, it } from "vitest";

import { escapeIgnorePattern } from "./escape-ignore-pattern";

describe("escapeIgnorePattern", () => {
	it("should leave an ordinary path alone", ({ expect }) => {
		expect.assertions(1);

		expect(escapeIgnorePattern("packages/ui")).toBe("packages/ui");
	});

	it("should escape every character a gitignore pattern treats as special", ({ expect }) => {
		expect.assertions(1);

		expect(escapeIgnorePattern(String.raw`a*b?c[d]e\f`)).toBe(String.raw`a\*b\?c\[d\]e\\f`);
	});
});
