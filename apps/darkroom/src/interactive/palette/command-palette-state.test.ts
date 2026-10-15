import { describe, it } from "vitest";

import { CommandGroup } from "$interactive/keys/browser-command";
import { BrowserKey } from "$interactive/keys/browser-keys";

import { getPaletteMatches, INITIAL_PALETTE_STATE, reducePaletteState, splitTitle } from "./command-palette-state";

import type { BrowserCommand } from "$interactive/keys/browser-command";

function createCommand(title: string, key: BrowserKey): BrowserCommand {
	return { key, group: CommandGroup.Act, keyLabel: key, run: () => undefined, title };
}

const COMMANDS = [
	createCommand("Copy run ID", BrowserKey.Copy),
	createCommand("Delete run", BrowserKey.Delete),
	createCommand("Open images", BrowserKey.Open),
];

describe("getPaletteMatches", () => {
	it("offers every command, in order, before anything is typed", ({ expect }) => {
		expect.assertions(1);

		expect(getPaletteMatches(COMMANDS, " ").map(({ command }) => command.title)).toStrictEqual([
			"Copy run ID",
			"Delete run",
			"Open images",
		]);
	});

	it("keeps fuzzy matches and marks the matched characters", ({ expect }) => {
		expect.assertions(1);

		expect(getPaletteMatches(COMMANDS, "del")).toStrictEqual([
			{ command: COMMANDS[1], positions: new Set([0, 1, 2]) },
		]);
	});
});

describe("splitTitle", () => {
	it("groups matched and unmatched characters into runs", ({ expect }) => {
		expect.assertions(1);

		expect(splitTitle("Delete run", new Set([0, 1, 8]))).toStrictEqual([
			{ isMatch: true, start: 0, text: "De" },
			{ isMatch: false, start: 2, text: "lete r" },
			{ isMatch: true, start: 8, text: "u" },
			{ isMatch: false, start: 9, text: "n" },
		]);
	});
});

describe("reducePaletteState", () => {
	it("moves within the matches and starts over when the query changes", ({ expect }) => {
		expect.assertions(2);

		const moved = reducePaletteState(INITIAL_PALETTE_STATE, {
			count: 3,
			move: { delta: 5, type: "move" },
			type: "move",
		});

		expect(moved.cursor).toBe(2);
		expect(reducePaletteState(moved, { query: "op", type: "query" })).toStrictEqual({ cursor: 0, query: "op" });
	});
});
