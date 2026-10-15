import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { measureElement } from "./mouse-context";

import type { DOMElement } from "ink";

interface Layout {
	readonly height: number;
	readonly left: number;
	readonly top: number;
	readonly width: number;
}

function createElement({ height, left, top, width }: Layout, parentNode?: DOMElement): DOMElement {
	return fromPartial<DOMElement>({
		parentNode,
		yogaNode: {
			getComputedHeight: () => height,
			getComputedLeft: () => left,
			getComputedTop: () => top,
			getComputedWidth: () => width,
		},
	});
}

describe("measureElement", () => {
	it("adds up the offsets of the element and every parent", ({ expect }) => {
		expect.assertions(1);

		const screen = createElement({ height: 30, left: 0, top: 0, width: 120 });
		const panel = createElement({ height: 10, left: 18, top: 13, width: 80 }, screen);
		const row = createElement({ height: 1, left: 3, top: 1, width: 40 }, panel);

		expect(measureElement(row)).toStrictEqual({ height: 1, left: 21, top: 14, width: 40 });
	});

	it("measures nothing before layout or while the element has no size", ({ expect }) => {
		expect.assertions(2);

		expect(measureElement(fromPartial<DOMElement>({}))).toBeUndefined();
		expect(measureElement(createElement({ height: 0, left: 4, top: 4, width: 10 }))).toBeUndefined();
	});
});
