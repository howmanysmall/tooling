import { describe, it } from "vitest";

import { BrowserKey } from "./browser-keys.ts";
import { getGenerateKey } from "./generate-commands.ts";
import { NO_KEY } from "./test-key.ts";

describe("getGenerateKey", () => {
	it("generates on a plain Enter but leaves alt+enter for a new line", ({ expect }) => {
		expect.assertions(2);

		expect(getGenerateKey("\r", { ...NO_KEY, return: true })).toBe(BrowserKey.Generate);
		expect(getGenerateKey("", { ...NO_KEY, meta: true, return: true })).toBeUndefined();
	});

	it("binds the control keys and leaves typing to the prompt box", ({ expect }) => {
		expect.assertions(4);

		expect(getGenerateKey("o", { ...NO_KEY, ctrl: true })).toBe(BrowserKey.ChooseModel);
		expect(getGenerateKey("g", { ...NO_KEY, ctrl: true })).toBe(BrowserKey.Guided);
		// A sent request is never canceled, so Esc does nothing here.
		expect(getGenerateKey("", { ...NO_KEY, escape: true })).toBeUndefined();
		expect(getGenerateKey("o", NO_KEY)).toBeUndefined();
	});
});
