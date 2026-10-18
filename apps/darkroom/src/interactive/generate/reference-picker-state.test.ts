import { describe, it } from "vitest";

import {
	createPickerState,
	enterDirectory,
	getOpenTarget,
	getVisibleEntries,
	moveCursor,
	setFilter,
	toggleCurrent,
} from "./reference-picker-state";

import type { DirectoryItem } from "./reference-picker-state";

const MOODBOARD: ReadonlyArray<DirectoryItem> = [
	{ name: "tree.jpg", isDirectory: false },
	{ name: "notes.txt", isDirectory: false },
	{ name: "old", isDirectory: true },
	{ name: ".hidden.png", isDirectory: false },
	{ name: "sky.png", isDirectory: false },
	{ name: ".git", isDirectory: true },
];

function getNames(state: Parameters<typeof getVisibleEntries>[0]): Array<string> {
	return getVisibleEntries(state).map((entry) => entry.name);
}

describe("reference picker state", () => {
	it("lists ../, then folders, then image files, hiding dotfiles and other files", ({ expect }) => {
		expect.assertions(1);

		expect(getNames(createPickerState("/home/moodboard", MOODBOARD, 3))).toStrictEqual([
			"../",
			"old/",
			"sky.png",
			"tree.jpg",
		]);
	});

	it("filters the folder while keeping ../ visible", ({ expect }) => {
		expect.assertions(1);

		const state = setFilter(createPickerState("/home/moodboard", MOODBOARD, 3), "SKY");

		expect(getNames(state)).toStrictEqual(["../", "sky.png"]);
	});

	it("toggles files and keeps the selection when changing folders", ({ expect }) => {
		expect.assertions(2);

		let state = moveCursor(createPickerState("/home/moodboard", MOODBOARD, 3), 2);
		state = toggleCurrent(state);
		state = enterDirectory(state, "/home/moodboard/old", [{ name: "house.webp", isDirectory: false }]);
		state = toggleCurrent(moveCursor(state, 1));

		expect(state.selected).toStrictEqual(["/home/moodboard/sky.png", "/home/moodboard/old/house.webp"]);
		expect(toggleCurrent(state).selected).toStrictEqual(["/home/moodboard/sky.png"]);
	});

	it("warns instead of selecting past the limit", ({ expect }) => {
		expect.assertions(2);

		let state = toggleCurrent(moveCursor(createPickerState("/home/moodboard", MOODBOARD, 1), 2));
		state = toggleCurrent(moveCursor(state, 1));

		expect(state.selected).toStrictEqual(["/home/moodboard/sky.png"]);
		expect(state.warning).toBe("This model takes at most 1 reference image.");
	});

	it("opens folders and ../ but not files, and wraps the cursor", ({ expect }) => {
		expect.assertions(3);

		const state = createPickerState("/home/moodboard", MOODBOARD, 3);

		expect(getOpenTarget(state)).toBe("/home");
		expect(getOpenTarget(moveCursor(state, 1))).toBe("/home/moodboard/old");
		expect(getOpenTarget(moveCursor(state, -2))).toBeUndefined();
	});
});
