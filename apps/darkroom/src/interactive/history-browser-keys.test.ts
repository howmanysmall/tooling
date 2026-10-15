import { describe, it } from "vitest";

import { BrowserKey, formatClipboardSequence, getBrowserKey } from "./history-browser-keys.ts";

import type { Key } from "ink";

const NO_KEY: Key = {
	backspace: false,
	capsLock: false,
	ctrl: false,
	delete: false,
	downArrow: false,
	end: false,
	escape: false,
	home: false,
	hyper: false,
	leftArrow: false,
	meta: false,
	numLock: false,
	pageDown: false,
	pageUp: false,
	return: false,
	rightArrow: false,
	shift: false,
	super: false,
	tab: false,
	upArrow: false,
};

describe("getBrowserKey", () => {
	it("maps arrows, letters, and Enter to their bindings", ({ expect }) => {
		expect.assertions(5);

		expect(getBrowserKey("", { ...NO_KEY, downArrow: true })).toBe(BrowserKey.Down);
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

describe("formatClipboardSequence", () => {
	it("wraps the base64 text in an OSC 52 clipboard sequence", ({ expect }) => {
		expect.assertions(1);

		expect(formatClipboardSequence("01M4YV")).toBe("\u001B]52;c;MDFNNFlW\u0007");
	});
});
