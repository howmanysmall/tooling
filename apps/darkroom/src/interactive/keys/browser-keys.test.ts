import { describe, it } from "vitest";

import { BrowserKey, getBrowserKey } from "./browser-keys";
import { NO_KEY } from "./test-key";

describe("getBrowserKey", () => {
	it("maps arrows, letters, and Enter to their bindings", ({ expect }) => {
		expect.assertions(6);

		expect(getBrowserKey("", { ...NO_KEY, downArrow: true })).toBe(BrowserKey.Down);
		expect(getBrowserKey("s", NO_KEY)).toBe(BrowserKey.Sort);
		expect(getBrowserKey("", { ...NO_KEY, return: true })).toBe(BrowserKey.Open);
		expect(getBrowserKey("G", { ...NO_KEY, shift: true })).toBe(BrowserKey.Last);
		expect(getBrowserKey("g", NO_KEY)).toBe(BrowserKey.First);
		expect(getBrowserKey("x", NO_KEY)).toBeUndefined();
	});

	it("ignores letters typed with Ctrl", ({ expect }) => {
		expect.assertions(1);

		expect(getBrowserKey("d", { ...NO_KEY, ctrl: true })).toBeUndefined();
	});
});
