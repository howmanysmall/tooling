import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";

import {
	BrowserMode,
	createBrowserState,
	getSelectedRun,
	getVisibleRuns,
	reduceBrowserState,
} from "./history-browser-state.ts";

import type { BrowserAction, BrowserState } from "./history-browser-state.ts";

const CAT = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { prompt: "A cat in a hat" });
const DOG = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { model: "google/gemini-cat-edition", prompt: "a dog" });
const TREE = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a tree" });

function applyActions(state: BrowserState, actions: ReadonlyArray<BrowserAction>): BrowserState {
	let next = state;
	for (const action of actions) next = reduceBrowserState(next, action);
	return next;
}

describe("history browser state", () => {
	it("filters by prompt or model, ignoring case, and starts at the top", ({ expect }) => {
		expect.assertions(2);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ delta: 2, type: "move" },
			{ mode: BrowserMode.Filter, type: "mode" },
			{ filter: " CAT ", type: "filter" },
		]);

		expect(getVisibleRuns(state).map((entry) => entry.id)).toStrictEqual([CAT.id, DOG.id]);
		expect(getSelectedRun(state)).toBe(CAT);
	});

	it("keeps the cursor on the list when moving past either end", ({ expect }) => {
		expect.assertions(4);

		const state = createBrowserState([CAT, DOG, TREE]);

		expect(getSelectedRun(reduceBrowserState(state, { delta: 10, type: "move" }))).toBe(TREE);
		expect(getSelectedRun(reduceBrowserState(state, { delta: -10, type: "move" }))).toBe(CAT);
		expect(getSelectedRun(reduceBrowserState(state, { type: "last" }))).toBe(TREE);
		expect(getSelectedRun(applyActions(state, [{ type: "last" }, { type: "first" }]))).toBe(CAT);
	});

	it("selects the next run up when the last one is removed, and returns to the list", ({ expect }) => {
		expect.assertions(3);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ type: "last" },
			{ mode: BrowserMode.ConfirmDelete, type: "mode" },
			{ id: TREE.id, type: "removed" },
		]);

		expect(getVisibleRuns(state)).toStrictEqual([CAT, DOG]);
		expect(getSelectedRun(state)).toBe(DOG);
		expect(state.mode).toBe(BrowserMode.Normal);
	});

	it("selects nothing once every run is gone", ({ expect }) => {
		expect.assertions(1);

		const state = reduceBrowserState(createBrowserState([CAT]), { id: CAT.id, type: "removed" });

		expect(getSelectedRun(state)).toBeUndefined();
	});

	it("clears the filter and returns to the list when the filter is cancelled", ({ expect }) => {
		expect.assertions(2);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ mode: BrowserMode.Filter, type: "mode" },
			{ filter: "tree", type: "filter" },
			{ type: "cancel-filter" },
		]);

		expect(getVisibleRuns(state)).toHaveLength(3);
		expect(state.mode).toBe(BrowserMode.Normal);
	});

	it("keeps the same state when the filter text has not changed", ({ expect }) => {
		expect.assertions(1);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ mode: BrowserMode.Filter, type: "mode" },
			{ filter: "cat", type: "filter" },
		]);

		expect(reduceBrowserState(state, { filter: " CAT ", type: "filter" })).toBe(state);
	});

	it("ignores filter text that arrives after the filter was closed", ({ expect }) => {
		expect.assertions(1);

		const state = reduceBrowserState(createBrowserState([CAT, DOG, TREE]), { filter: "tree", type: "filter" });

		expect(getVisibleRuns(state)).toHaveLength(3);
	});

	it("clears the status on the next move", ({ expect }) => {
		expect.assertions(2);

		const status = { text: "Copied", tone: "success" } as const;
		const state = reduceBrowserState(createBrowserState([CAT, DOG]), { status, type: "status" });

		expect(state.status).toBe(status);
		expect(reduceBrowserState(state, { delta: 1, type: "move" }).status).toBeUndefined();
	});
});
