import { describe, it } from "vitest";

import { getNearbyItems } from "./nearby-items";

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

describe("getNearbyItems", () => {
	it("puts the selection first, then a few behind and more ahead", ({ expect }) => {
		expect.assertions(2);

		expect(getNearbyItems(LETTERS, 4)).toStrictEqual(["e", "c", "d", "f", "g", "h", "i"]);
		expect(getNearbyItems(LETTERS, 0)).toStrictEqual(["a", "b", "c", "d", "e"]);
	});

	it("stays inside the list at its end, and handles an empty one", ({ expect }) => {
		expect.assertions(2);

		expect(getNearbyItems(LETTERS, 9)).toStrictEqual(["j", "h", "i"]);
		expect(getNearbyItems([], 0)).toStrictEqual([]);
	});
});
