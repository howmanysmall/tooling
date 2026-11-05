import { describe, it } from "vitest";

import { getEighths, getPercent } from "./number-utilities";

describe("nubmer-utilities", () => {
	describe("getEighths", () => {
		it("should be empty for nothing and full for the whole", ({ expect }) => {
			expect.assertions(3);

			expect(getEighths(0, 100)).toBe(0);
			expect(getEighths(100, 100)).toBe(80);
			expect(getEighths(5, 0)).toBe(0);
		});

		it("should give any non-zero part at least one", ({ expect }) => {
			expect.assertions(1);

			expect(getEighths(1, 1_000_000)).toBe(1);
		});

		it("should round to the nearest eighth", ({ expect }) => {
			expect.assertions(1);

			expect(getEighths(100, 300)).toBe(27);
		});
	});

	describe("getPercent", () => {
		it("should round to one decimal", ({ expect }) => {
			expect.assertions(3);

			expect(getPercent(1, 3)).toBeCloseTo(33.3, 5);
			expect(getPercent(2, 3)).toBeCloseTo(66.7, 5);
			expect(getPercent(1, 1)).toBe(100);
		});

		it("should be zero when the whole is empty", ({ expect }) => {
			expect.assertions(1);

			expect(getPercent(0, 0)).toBe(0);
		});
	});
});
