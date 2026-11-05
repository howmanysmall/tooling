import { describe, it } from "vitest";

import { groupDigits, shorten } from "./string-utilities";

describe("string-utilities", () => {
	describe("groupDigits", () => {
		it("should put a comma between each group of three digits", ({ expect }) => {
			expect.assertions(6);

			expect(groupDigits(0)).toBe("0");
			expect(groupDigits(999)).toBe("999");
			expect(groupDigits(1000)).toBe("1,000");
			expect(groupDigits(12_345)).toBe("12,345");
			expect(groupDigits(131_523)).toBe("131,523");
			expect(groupDigits(1_234_567)).toBe("1,234,567");
		});
	});

	describe("shorten", () => {
		it("should leave text that fits alone", ({ expect }) => {
			expect.assertions(1);

			expect(shorten("short", 10)).toBe("short");
		});

		it("should cut long text to the width, ending in an ellipsis", ({ expect }) => {
			expect.assertions(1);

			expect(shorten("abcdefghij", 6)).toBe("abcde…");
		});

		it("should count a wide character as two cells", ({ expect }) => {
			expect.assertions(1);

			// Four wide characters are eight cells. Seven cells leaves room for
			// three, then the ellipsis.
			expect(shorten("日本語です", 7)).toBe("日本語…");
		});
	});
});
