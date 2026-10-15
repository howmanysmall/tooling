import { describe, it } from "vitest";

import { createEntry } from "./history-fixture.ts";
import { getParentChain, resolveRunReference } from "./resolve-run-reference.ts";

const ENTRIES = [
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAAA"),
	createEntry("01M4YVBBBBBBBBBBBBBBBBBBBB", { parent: "01M4YVAAAAAAAAAAAAAAAAAAAA" }),
	createEntry("01M4YVBCCCCCCCCCCCCCCCCCCC", { parent: "01M4YVBBBBBBBBBBBBBBBBBBBB" }),
];

describe("resolveRunReference", () => {
	it("finds the newest run with last and older ones with last~N", ({ expect }) => {
		expect.assertions(2);

		expect(resolveRunReference(ENTRIES, "last").id).toBe("01M4YVBCCCCCCCCCCCCCCCCCCC");
		expect(resolveRunReference(ENTRIES, "last~2").id).toBe("01M4YVAAAAAAAAAAAAAAAAAAAA");
	});

	it("accepts a unique prefix in any case", ({ expect }) => {
		expect.assertions(1);

		expect(resolveRunReference(ENTRIES, "01m4yvbc").id).toBe("01M4YVBCCCCCCCCCCCCCCCCCCC");
	});

	it("lists the matches for an ambiguous prefix", ({ expect }) => {
		expect.assertions(2);

		expect(() => resolveRunReference(ENTRIES, "01M4YVB")).toThrow('"01M4YVB" matches 2 runs');
		expect(() => resolveRunReference(ENTRIES, "01M4YVB")).toThrow("01M4YVBC  2026-10-14  prompt for");
	});

	it("rejects references that match nothing", ({ expect }) => {
		expect.assertions(2);

		expect(() => resolveRunReference(ENTRIES, "ZZZ")).toThrow('No run matches "ZZZ".');
		expect(() => resolveRunReference(ENTRIES, "last~3")).toThrow("There is no run last~3");
	});
});

describe("getParentChain", () => {
	it("follows parents back to the first run", ({ expect }) => {
		expect.assertions(1);

		const last = resolveRunReference(ENTRIES, "last");

		expect(getParentChain(ENTRIES, last).map((entry) => entry.id)).toStrictEqual([
			"01M4YVBBBBBBBBBBBBBBBBBBBB",
			"01M4YVAAAAAAAAAAAAAAAAAAAA",
		]);
	});
});
