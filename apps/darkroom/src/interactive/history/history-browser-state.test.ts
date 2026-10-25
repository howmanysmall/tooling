import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";
import { CursorMoveType } from "$interactive/components/list-cursor";
import { StatusActionType } from "$interactive/components/status-message";

import {
	BrowserActionType,
	BrowserMode,
	createBrowserState,
	getSelectedRun,
	getVisibleRuns,
	reduceBrowserState,
} from "./history-browser-state";

import type { BrowserAction, BrowserState } from "./history-browser-state";

const CAT = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { prompt: "A cat in a hat" });
const DOG = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { model: "google/gemini-cat-edition", prompt: "a dog" });
const TREE = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a tree" });

function applyActions(state: BrowserState, actions: ReadonlyArray<BrowserAction>): BrowserState {
	let next = state;
	for (const action of actions) {
		next = reduceBrowserState(next, action);
	}

	return next;
}

describe("history browser state", () => {
	it("filters by prompt or model, ignoring case, and starts at the top", ({ expect }) => {
		expect.assertions(2);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ delta: 2, type: CursorMoveType.Move },
			{ mode: BrowserMode.Filter, type: BrowserActionType.Mode },
			{ filter: " CAT ", type: BrowserActionType.Filter },
		]);

		expect(getVisibleRuns(state).map((entry) => entry.id)).toStrictEqual([CAT.id, DOG.id]);
		expect(getSelectedRun(state)).toBe(CAT);
	});

	it("keeps the cursor on the list when moving past either end", ({ expect }) => {
		expect.assertions(4);

		const state = createBrowserState([CAT, DOG, TREE]);

		expect(getSelectedRun(reduceBrowserState(state, { delta: 10, type: CursorMoveType.Move }))).toBe(TREE);
		expect(getSelectedRun(reduceBrowserState(state, { delta: -10, type: CursorMoveType.Move }))).toBe(CAT);
		expect(getSelectedRun(reduceBrowserState(state, { type: CursorMoveType.Last }))).toBe(TREE);
		expect(
			getSelectedRun(applyActions(state, [{ type: CursorMoveType.Last }, { type: CursorMoveType.First }])),
		).toBe(CAT);
	});

	it("selects the next run up when the last one is removed, and returns to the list", ({ expect }) => {
		expect.assertions(3);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ type: CursorMoveType.Last },
			{ mode: BrowserMode.ConfirmDelete, type: BrowserActionType.Mode },
			{ id: TREE.id, type: BrowserActionType.Removed },
		]);

		expect(getVisibleRuns(state)).toStrictEqual([CAT, DOG]);
		expect(getSelectedRun(state)).toBe(DOG);
		expect(state.mode).toBe(BrowserMode.Normal);
	});

	it("selects nothing once every run is gone", ({ expect }) => {
		expect.assertions(1);

		const state = reduceBrowserState(createBrowserState([CAT]), { id: CAT.id, type: BrowserActionType.Removed });

		expect(getSelectedRun(state)).toBeUndefined();
	});

	it("clears the filter and returns to the list when the filter is canceled", ({ expect }) => {
		expect.assertions(2);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ mode: BrowserMode.Filter, type: BrowserActionType.Mode },
			{ filter: "tree", type: BrowserActionType.Filter },
			{ type: BrowserActionType.CancelFilter },
		]);

		expect(getVisibleRuns(state)).toHaveLength(3);
		expect(state.mode).toBe(BrowserMode.Normal);
	});

	it("keeps the same state when the filter text has not changed", ({ expect }) => {
		expect.assertions(1);

		const state = applyActions(createBrowserState([CAT, DOG, TREE]), [
			{ mode: BrowserMode.Filter, type: BrowserActionType.Mode },
			{ filter: "cat", type: BrowserActionType.Filter },
		]);

		expect(reduceBrowserState(state, { filter: " CAT ", type: BrowserActionType.Filter })).toBe(state);
	});

	it("ignores filter text that arrives after the filter was closed", ({ expect }) => {
		expect.assertions(1);

		const state = reduceBrowserState(createBrowserState([CAT, DOG, TREE]), {
			filter: "tree",
			type: BrowserActionType.Filter,
		});

		expect(getVisibleRuns(state)).toHaveLength(3);
	});

	it("keeps a toast until it expires, but not when a newer one replaced it", ({ expect }) => {
		expect.assertions(3);

		const first = { id: 1, text: "Copied", tone: "success" } as const;
		const second = { id: 2, text: "Opened", tone: "success" } as const;
		const shown = reduceBrowserState(createBrowserState([CAT, DOG]), {
			status: first,
			type: StatusActionType.Status,
		});
		const replaced = reduceBrowserState(shown, { status: second, type: StatusActionType.Status });

		expect(reduceBrowserState(shown, { delta: 1, type: CursorMoveType.Move }).status).toBe(first);
		expect(reduceBrowserState(shown, { id: 1, type: StatusActionType.StatusExpired }).status).toBeUndefined();
		expect(reduceBrowserState(replaced, { id: 1, type: StatusActionType.StatusExpired }).status).toBe(second);
	});
});

describe("comparison batches", () => {
	const BANANA = createEntry("01M4YVAAAAAAAAAAAAAAAAAAB2", { batch: "b", model: "google/banana" });
	const ADA = createEntry("01M4YVAAAAAAAAAAAAAAAAAAB1", { batch: "b", model: "ada/one" });
	// Newest first; the batch sorts as ada, bfl, google.
	const ENTRIES = [
		CAT,
		createEntry("01M4YVAAAAAAAAAAAAAAAAAAB3", { batch: "b", model: "bfl/flux" }),
		BANANA,
		ADA,
		TREE,
	];

	it("lists a batch as one row, starting with its first model", ({ expect }) => {
		expect.assertions(1);

		expect(getVisibleRuns(createBrowserState(ENTRIES))).toStrictEqual([CAT, ADA, TREE]);
	});

	it("steps through the batch's runs by model, stopping at either end", ({ expect }) => {
		expect.assertions(3);

		const onBatch = reduceBrowserState(createBrowserState(ENTRIES), { delta: 1, type: CursorMoveType.Move });
		const stepped = applyActions(onBatch, [
			{ delta: 1, type: BrowserActionType.StepBatch },
			{ delta: 1, type: BrowserActionType.StepBatch },
			{ delta: 1, type: BrowserActionType.StepBatch },
		]);

		expect(getSelectedRun(stepped)).toBe(BANANA);
		expect(getVisibleRuns(stepped)).toStrictEqual([CAT, BANANA, TREE]);
		expect(getSelectedRun(reduceBrowserState(onBatch, { delta: -1, type: BrowserActionType.StepBatch }))).toBe(ADA);
	});

	it("shows a batch's matching run when filtering, and ignores steps outside a batch", ({ expect }) => {
		expect.assertions(2);

		const filtered = applyActions(createBrowserState(ENTRIES), [
			{ mode: BrowserMode.Filter, type: BrowserActionType.Mode },
			{ filter: "banana", type: BrowserActionType.Filter },
		]);
		const plain = createBrowserState(ENTRIES);

		expect(getVisibleRuns(filtered)).toStrictEqual([BANANA]);
		expect(reduceBrowserState(plain, { delta: 1, type: BrowserActionType.StepBatch })).toBe(plain);
	});
});
