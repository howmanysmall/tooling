import { describe, it } from "vitest";

import { getMarqueeCycle, getMarqueeOffset, MARQUEE_PAUSE_TICKS, placeRuns, sliceMarquee, sliceRuns } from "./marquee";

describe("getMarqueeOffset", () => {
	it("rests at the start, scrolls through one loop, and rests again", ({ expect }) => {
		expect.assertions(4);

		const cycle = getMarqueeCycle("abcdef");

		expect(cycle).toBe(9);
		expect(getMarqueeOffset(MARQUEE_PAUSE_TICKS - 1, cycle)).toBe(0);
		expect(getMarqueeOffset(MARQUEE_PAUSE_TICKS + 3, cycle)).toBe(3);
		expect(getMarqueeOffset(MARQUEE_PAUSE_TICKS + cycle, cycle)).toBe(0);
	});
});

describe("sliceMarquee", () => {
	it("loops the text after a gap, mapping each character to its source", ({ expect }) => {
		expect.assertions(2);

		const scrolled = sliceMarquee("abcdef", 6, 4);

		expect(scrolled.text).toBe("ef · a");
		expect(scrolled.sources).toStrictEqual([4, 5, undefined, undefined, undefined, 0]);
	});

	it("skips a wide character the left edge cuts and never overfills", ({ expect }) => {
		expect.assertions(1);

		// `猫` takes two cells; scrolling one cell in drops it whole.
		expect(sliceMarquee("猫猫猫", 4, 1).text).toBe("猫猫");
	});
});

describe("sliceRuns", () => {
	it("keeps each part's style as it scrolls, giving the gap the first color", ({ expect }) => {
		expect.assertions(2);

		const runs = [
			{ color: "white", isBold: true, text: "Name" },
			{ color: "gray", text: "  maker" },
		];

		expect(placeRuns(runs).map(({ start }) => start)).toStrictEqual([0, 4]);
		expect(sliceRuns(runs, sliceMarquee("Name  maker", 8, 6))).toStrictEqual([
			{ color: "gray", start: 0, text: "maker" },
			{ color: "white", start: 5, text: " · " },
		]);
	});
});
