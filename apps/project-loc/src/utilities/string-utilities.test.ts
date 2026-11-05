import { describe, it } from "vitest";

import {
	compareWithLocale,
	getWidestWidth,
	groupDigits,
	padEnd,
	padStart,
	shorten,
	toAsciiLowerCase,
	toLowercase,
} from "./string-utilities";

describe("string-utilities", () => {
	describe("compareWithLocale", () => {
		it("should order names without regard to case", ({ expect }) => {
			expect.assertions(2);

			expect(compareWithLocale("apple", "Banana")).toBeLessThan(0);
			expect(compareWithLocale("Zebra", "apple")).toBeGreaterThan(0);
		});

		it("should treat an accented letter as the letter beneath it", ({ expect }) => {
			expect.assertions(1);

			expect(compareWithLocale("café", "cafe")).toBe(0);
		});
	});

	describe("toLowercase", () => {
		it("should lowercase every letter and leave the rest alone", ({ expect }) => {
			expect.assertions(2);

			expect(toLowercase("ABC123")).toBe("abc123");
			expect(toLowercase("ÉÀ")).toBe("éà");
		});
	});

	describe("toAsciiLowerCase", () => {
		it("should lowercase only the ASCII letters", ({ expect }) => {
			expect.assertions(2);

			expect(toAsciiLowerCase("Hello WORLD")).toBe("hello world");
			expect(toAsciiLowerCase("ÉÀÜ")).toBe("ÉÀÜ");
		});
	});

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

		it("should not split a letter from its combining mark", ({ expect }) => {
			expect.assertions(1);

			// Three decomposed e-acutes are three cells. At a width of two, one
			// grapheme and the ellipsis fit, so the next must be dropped whole.
			expect(shorten("e\u0301e\u0301e\u0301", 2)).toBe("e\u0301…");
		});
	});

	describe("padEnd", () => {
		it("should add spaces until the text fills the width", ({ expect }) => {
			expect.assertions(2);

			expect(padEnd("abc", 5)).toBe("abc  ");
			expect(padEnd("abc", 3)).toBe("abc");
		});

		it("should measure a wide character as two cells", ({ expect }) => {
			expect.assertions(1);

			expect(padEnd("日本", 6)).toBe("日本  ");
		});

		it("should leave text that is already too wide alone", ({ expect }) => {
			expect.assertions(1);

			expect(padEnd("abcdef", 3)).toBe("abcdef");
		});
	});

	describe("padStart", () => {
		it("should add spaces until the text fills the width", ({ expect }) => {
			expect.assertions(2);

			expect(padStart("abc", 5)).toBe("  abc");
			expect(padStart("abc", 3)).toBe("abc");
		});

		it("should measure a wide character as two cells", ({ expect }) => {
			expect.assertions(1);

			expect(padStart("日本", 6)).toBe("  日本");
		});

		it("should leave text that is already too wide alone", ({ expect }) => {
			expect.assertions(1);

			expect(padStart("abcdef", 3)).toBe("abcdef");
		});
	});

	describe("getWidestWidth", () => {
		it("should use the widest cell", ({ expect }) => {
			expect.assertions(1);

			expect(getWidestWidth("NAME", ["Rust", "TypeScript"])).toBe(10);
		});

		it("should never be narrower than the header", ({ expect }) => {
			expect.assertions(1);

			expect(getWidestWidth("PROJECT", ["Go", "Rust"])).toBe(7);
		});

		it("should measure a wide character as two cells", ({ expect }) => {
			expect.assertions(1);

			expect(getWidestWidth("NAME", ["日本語"])).toBe(6);
		});
	});
});
