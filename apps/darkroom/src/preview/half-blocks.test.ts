import { describe, it } from "vitest";

import { formatHalfBlocks } from "./half-blocks";

const ESC = "\u001B";

describe("formatHalfBlocks", () => {
	it("draws the top pixel as the foreground and the bottom one as the background", ({ expect }) => {
		expect.assertions(1);

		const pixels = new Uint8Array([255, 0, 0, 0, 0, 255]);

		expect(formatHalfBlocks(pixels, 1, 2)).toStrictEqual([`${ESC}[38;2;255;0;0m${ESC}[48;2;0;0;255m▀${ESC}[0m`]);
	});

	it("repeats the last row when the height is odd", ({ expect }) => {
		expect.assertions(1);

		expect(formatHalfBlocks(new Uint8Array([9, 9, 9]), 1, 1)).toStrictEqual([
			`${ESC}[38;2;9;9;9m${ESC}[48;2;9;9;9m▀${ESC}[0m`,
		]);
	});
});
