import { describe, it } from "vitest";

import { listSessions, resolveSessionReference } from "./session-list";

import type { HistoryEntry } from "./history-entry";

function createRun(id: string, session: string | undefined, prompt: string, cost?: number): HistoryEntry {
	return {
		id,
		cost,
		created: `2026-10-15T09:00:0${id.at(-1) ?? "0"}.000Z`,
		images: [],
		model: "test/multi",
		prompt,
		references: [],
		// oxlint-disable-next-line id-length -- the API calls this field n
		request: { n: 1 },
		requested: 1,
		returned: 1,
		session,
	};
}

// Newest first, as the app reads them.
const RUNS = [
	createRun("01M4YVAAAAAAAAAAAAAAAAAAA4", "01SESSIONAAAAAAAAAAAAAAAB2", "a dog", 0.02),
	createRun("01M4YVAAAAAAAAAAAAAAAAAAA3", undefined, "from the command line"),
	createRun("01M4YVAAAAAAAAAAAAAAAAAAA2", "01SESSIONAAAAAAAAAAAAAAAA1", "give it sunglasses", 0.01),
	createRun("01M4YVAAAAAAAAAAAAAAAAAAA1", "01SESSIONAAAAAAAAAAAAAAAA1", "a cat"),
];

describe("listSessions", () => {
	it("groups the app's runs into sessions named by their first prompt, the one used last first", ({ expect }) => {
		expect.assertions(1);

		expect(
			listSessions(RUNS).map(({ id, cost, runs, title }) => ({ id, cost, runs: runs.length, title })),
		).toStrictEqual([
			{ id: "01SESSIONAAAAAAAAAAAAAAAB2", cost: 0.02, runs: 1, title: "a dog" },
			{ id: "01SESSIONAAAAAAAAAAAAAAAA1", cost: 0.01, runs: 2, title: "a cat" },
		]);
	});
});

describe("resolveSessionReference", () => {
	it("finds the session used last, or one by a unique prefix of its ID", ({ expect }) => {
		expect.assertions(2);

		const sessions = listSessions(RUNS);

		expect(resolveSessionReference(sessions, "last").title).toBe("a dog");
		expect(resolveSessionReference(sessions, "01sessionaaaaaaaaaaaaaaaa").title).toBe("a cat");
	});

	it("refuses an ambiguous prefix or one that matches nothing", ({ expect }) => {
		expect.assertions(3);

		const sessions = listSessions(RUNS);

		expect(() => resolveSessionReference(sessions, "01SESSION")).toThrow("matches 2 sessions");
		expect(() => resolveSessionReference(sessions, "ZZZ")).toThrow("No session matches");
		expect(() => resolveSessionReference([], "last")).toThrow("no session yet");
	});
});
