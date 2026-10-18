import { describe, it } from "vitest";

import { NO_KEY } from "$interactive/keys/test-key";

import { getShellRoute, ShellRoute } from "./shell-route";

import type { ShellSituation } from "./shell-route";

const PLAIN: ShellSituation = {
	hasDialog: false,
	hasShiftTab: false,
	hasTabs: true,
	isCapturing: false,
	isHelpOpen: false,
};
const TAB = { ...NO_KEY, tab: true };

describe("getShellRoute", () => {
	it("leaves every key but ctrl+c to an open dialog, and closes help on any key", ({ expect }) => {
		expect.assertions(3);

		expect(getShellRoute("c", { ...NO_KEY, ctrl: true }, { ...PLAIN, hasDialog: true })).toBe(ShellRoute.Interrupt);
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

	it("gives shift+tab to a screen that uses it, while tab still switches tabs", ({ expect }) => {
		expect.assertions(2);

		const generate = { ...PLAIN, hasShiftTab: true, isCapturing: true };

		expect(getShellRoute("", { ...TAB, shift: true }, generate)).toBe(ShellRoute.ShiftTab);
		expect(getShellRoute("", TAB, generate)).toBe(ShellRoute.NextTab);
	});

	it("opens help on ? and sends other keys to the commands", ({ expect }) => {
		expect.assertions(3);

		expect(getShellRoute("?", NO_KEY, PLAIN)).toBe(ShellRoute.OpenHelp);
		expect(getShellRoute("j", NO_KEY, PLAIN)).toBe(ShellRoute.Command);
		expect(getShellRoute("", TAB, { ...PLAIN, hasTabs: false })).toBe(ShellRoute.Command);
	});
});
