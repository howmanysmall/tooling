import { describe, it } from "vitest";

import { getShellRoute, ShellRoute } from "./shell-route.ts";
import { NO_KEY } from "./test-key.ts";

import type { ShellSituation } from "./shell-route.ts";

const PLAIN: ShellSituation = { hasDialog: false, hasTabs: true, isCapturing: false, isHelpOpen: false };
const TAB = { ...NO_KEY, tab: true };

describe("getShellRoute", () => {
	it("leaves every key to an open dialog, and closes help on any key", ({ expect }) => {
		expect.assertions(2);

		expect(getShellRoute("p", { ...NO_KEY, ctrl: true }, { ...PLAIN, hasDialog: true })).toBe(ShellRoute.Ignore);
		expect(getShellRoute("x", NO_KEY, { ...PLAIN, isHelpOpen: true })).toBe(ShellRoute.CloseHelp);
	});

	it("switches tabs and opens the palette even while the screen captures keys", ({ expect }) => {
		expect.assertions(4);

		const capturing = { ...PLAIN, isCapturing: true };

		expect(getShellRoute("", TAB, capturing)).toBe(ShellRoute.NextTab);
		expect(getShellRoute("", { ...TAB, shift: true }, capturing)).toBe(ShellRoute.PreviousTab);
		expect(getShellRoute("p", { ...NO_KEY, ctrl: true }, capturing)).toBe(ShellRoute.OpenPalette);
		expect(getShellRoute("?", NO_KEY, capturing)).toBe(ShellRoute.Capture);
	});

	it("opens help on ? and sends other keys to the commands", ({ expect }) => {
		expect.assertions(3);

		expect(getShellRoute("?", NO_KEY, PLAIN)).toBe(ShellRoute.OpenHelp);
		expect(getShellRoute("j", NO_KEY, PLAIN)).toBe(ShellRoute.Command);
		expect(getShellRoute("", TAB, { ...PLAIN, hasTabs: false })).toBe(ShellRoute.Command);
	});
});
