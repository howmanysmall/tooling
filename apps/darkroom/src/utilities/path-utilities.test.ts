import { describe, it } from "vitest";

import { makeStringSafeForPath } from "./path-utilities";

describe("path-utilities", () => {
	describe("makeStringSafeForPath", () => {
		it("keeps slugs that only hold supported characters unchanged", ({ expect }) => {
			expect.assertions(4);

			expect(makeStringSafeForPath("snake_case")).toBe("snake_case");
			expect(makeStringSafeForPath("kebab-case")).toBe("kebab-case");
			expect(makeStringSafeForPath("MixedCase123")).toBe("MixedCase123");
			expect(makeStringSafeForPath("2024-05-01")).toBe("2024-05-01");
		});

		it("replaces every run of unsupported characters with a single underscore", ({ expect }) => {
			expect.assertions(3);

			expect(makeStringSafeForPath("hello world")).toBe("hello_world");
			expect(makeStringSafeForPath("hello    world")).toBe("hello_world");
			expect(makeStringSafeForPath("file: name!.png")).toBe("file_name_png");
		});

		it("trims underscores from the edges of the slug", ({ expect }) => {
			expect.assertions(4);

			expect(makeStringSafeForPath("_hello_")).toBe("hello");
			expect(makeStringSafeForPath("hello world ")).toBe("hello_world");
			expect(makeStringSafeForPath("__a__b__")).toBe("a_b");
			expect(makeStringSafeForPath("")).toBe("");
		});

		it("folds accents, ligatures, and full-width letters to ascii", ({ expect }) => {
			expect.assertions(4);

			expect(makeStringSafeForPath("naïve")).toBe("naive");
			expect(makeStringSafeForPath("cafe\u0301")).toBe("cafe");
			expect(makeStringSafeForPath("ﬁle")).toBe("file");
			expect(makeStringSafeForPath("ＡＢＣ")).toBe("ABC");
		});

		it("drops characters with no ascii form", ({ expect }) => {
			expect.assertions(2);

			expect(makeStringSafeForPath("🎉party🎉")).toBe("party");
			expect(makeStringSafeForPath("Привет")).toBe("");
		});
	});
});
