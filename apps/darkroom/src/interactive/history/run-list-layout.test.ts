import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";

import { buildRunListItems, formatDayLabel, getVisibleItems } from "./run-list-layout.ts";

import type { HistoryEntry } from "$history/history-entry";

import type { RunListItem } from "./run-list-layout.ts";

// Local times, so the day boundaries don't depend on the machine's time zone.
const NOW = new Date(2026, 9, 15, 12);

function createRun(id: number, created: Date): HistoryEntry {
	return createEntry(`01M4YVAAAAAAAAAAAAAAAAAA${String(id).padStart(2, "0")}`, { created: created.toISOString() });
}

function describeItems(items: ReadonlyArray<RunListItem>): Array<string> {
	return items.map((item) => (item.kind === "day" ? `# ${item.label}` : `run ${item.index}`));
}

describe("formatDayLabel", () => {
	it("names today and yesterday, then the weekday and date", ({ expect }) => {
		expect.assertions(4);

		expect(formatDayLabel(new Date(2026, 9, 15, 0, 5), NOW)).toBe("Today");
		expect(formatDayLabel(new Date(2026, 9, 14, 23, 59), NOW)).toBe("Yesterday");
		expect(formatDayLabel(new Date(2026, 9, 12, 9), NOW)).toBe("Mon 12 Oct");
		expect(formatDayLabel(new Date(2025, 11, 31), NOW)).toBe("31 Dec 2025");
	});
});

describe("buildRunListItems", () => {
	it("puts a heading before the first run of each day", ({ expect }) => {
		expect.assertions(1);

		const runs = [
			createRun(3, new Date(2026, 9, 15, 9)),
			createRun(2, new Date(2026, 9, 15, 8)),
			createRun(1, new Date(2026, 9, 14, 22)),
		];

		expect(describeItems(buildRunListItems(runs, NOW))).toStrictEqual([
			"# Today",
			"run 0",
			"run 1",
			"# Yesterday",
			"run 2",
		]);
	});
});

describe("getVisibleItems", () => {
	const runs = Array.from({ length: 10 }, (_, index) => createRun(10 - index, new Date(2026, 9, 15, 11 - index)));
	const items = buildRunListItems(runs, NOW);

	it("shows everything when it fits", ({ expect }) => {
		expect.assertions(1);

		expect(getVisibleItems(items, 0, 100)).toHaveLength(items.length);
	});

	it("keeps the selected run whole and near the middle", ({ expect }) => {
		expect.assertions(1);

		// One heading line, then two lines per run: run 5 spans lines 11 and 12.
		expect(describeItems(getVisibleItems(items, 5, 8))).toStrictEqual(["run 3", "run 4", "run 5", "run 6"]);
	});

	it("never cuts a run in half at the bottom", ({ expect }) => {
		expect.assertions(1);

		expect(describeItems(getVisibleItems(items, 0, 6))).toStrictEqual(["# Today", "run 0", "run 1"]);
	});
});
