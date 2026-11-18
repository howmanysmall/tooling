import { describe, it } from "vitest";

import { scrollTranscript } from "./transcript-scroll";

describe("scrollTranscript", () => {
	it("scrolls back from the newest turn, and stops at the oldest", ({ expect }) => {
		expect.assertions(2);

		expect(scrollTranscript(40, -9, 40)).toBe(31);
		expect(scrollTranscript(3, -9, 40)).toBe(0);
	});

	it("follows the newest turn again once scrolled to the bottom", ({ expect }) => {
		expect.assertions(2);

		expect(scrollTranscript(35, 9, 40)).toBeUndefined();
		expect(scrollTranscript(0, 1, 0)).toBeUndefined();
	});
});
