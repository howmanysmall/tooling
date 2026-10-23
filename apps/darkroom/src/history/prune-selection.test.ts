import { describe, it } from "vitest";

import { compareWithLocale } from "$functions/compare-with-locale";

import { createEntry } from "./history-fixture";
import { parseDuration, parseSize, selectForPrune, toPruneCriteria } from "./prune-selection";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-14T00:00:00.000Z");

const ENTRIES = [
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { created: "2026-09-01T00:00:00.000Z" }),
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { created: "2026-10-01T00:00:00.000Z" }),
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { created: "2026-10-13T00:00:00.000Z" }),
];
const SIZES = new Map(ENTRIES.map((entry) => [entry.id, 1000]));

describe("parsing", () => {
	it("parses durations", ({ expect }) => {
		expect.assertions(3);

		expect(parseDuration("30d")).toBe(30 * DAY);
		expect(parseDuration("2w")).toBe(14 * DAY);
		expect(() => parseDuration("soon")).toThrow("is not a duration");
	});

	it("parses decimal and binary sizes", ({ expect }) => {
		expect.assertions(4);

		expect(parseSize("2GB")).toBe(2e9);
		expect(parseSize("1.5 mib")).toBe(1.5 * 1024 ** 2);
		expect(parseSize("512")).toBe(512);
		expect(() => parseSize("big")).toThrow("is not a size");
	});
});

describe("selectForPrune", () => {
	it("selects runs older than the cutoff", ({ expect }) => {
		expect.assertions(1);

		expect([...selectForPrune(ENTRIES, SIZES, { olderThan: 30 * DAY }, NOW)]).toStrictEqual([
			"01M4YVAAAAAAAAAAAAAAAAAAA1",
		]);
	});

	it("keeps only the newest N runs", ({ expect }) => {
		expect.assertions(1);

		expect([...selectForPrune(ENTRIES, SIZES, { keep: 1 }, NOW)]).toStrictEqual([
			"01M4YVAAAAAAAAAAAAAAAAAAA2",
			"01M4YVAAAAAAAAAAAAAAAAAAA1",
		]);
	});

	it("deletes the oldest runs until the rest fit the size limit", ({ expect }) => {
		expect.assertions(1);

		expect([...selectForPrune(ENTRIES, SIZES, { maxSize: 2500 }, NOW)]).toStrictEqual([
			"01M4YVAAAAAAAAAAAAAAAAAAA1",
		]);
	});

	it("deletes a run when any criterion selects it", ({ expect }) => {
		expect.assertions(1);

		const selected = selectForPrune(ENTRIES, SIZES, { keep: 2, olderThan: 2 * DAY }, NOW);

		expect([...selected].toSorted(compareWithLocale)).toStrictEqual([
			"01M4YVAAAAAAAAAAAAAAAAAAA1",
			"01M4YVAAAAAAAAAAAAAAAAAAA2",
		]);
	});
});

describe("toPruneCriteria", () => {
	it("returns nothing without flags, meaning report only", ({ expect }) => {
		expect.assertions(1);

		expect(toPruneCriteria({})).toBeUndefined();
	});

	it("parses each flag and rejects a negative --keep", ({ expect }) => {
		expect.assertions(2);

		expect(toPruneCriteria({ keep: 3, maxSize: "1KB", olderThan: "1h" })).toStrictEqual({
			keep: 3,
			maxSize: 1000,
			olderThan: 3_600_000,
		});
		expect(() => toPruneCriteria({ keep: -1 })).toThrow("--keep must be 0 or more.");
	});
});
