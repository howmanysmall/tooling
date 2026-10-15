import { describe, it } from "vitest";

import { getTabLayout } from "./session-tab-layout";

describe("getTabLayout", () => {
	it("shares the room between the tabs, up to a widest tab", ({ expect }) => {
		expect.assertions(2);

		expect(getTabLayout(120, 2)).toStrictEqual({ capacity: 2, width: 32 });
		expect(getTabLayout(80, 3)).toStrictEqual({ capacity: 3, width: 23 });
	});

	it("shows as many as fit at the narrowest when they don't all", ({ expect }) => {
		expect.assertions(1);

		expect(getTabLayout(80, 10)).toStrictEqual({ capacity: 3, width: 16 });
	});
});
