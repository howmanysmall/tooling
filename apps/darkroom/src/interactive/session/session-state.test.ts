import { describe, it } from "vitest";

import { MULTI_MODEL } from "$generation/model-fixture";
import { prepareGenerationAsync } from "$generation/run-generation";

import { createSession, getEditBase, PromptMode, reduceSession, TurnPhase } from "./session-state";
import { summarizeTurn } from "./turn-summary";

import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";

import type { SessionAction, SessionState } from "./session-state";

async function prepareAsync(): Promise<PreparedGeneration> {
	return prepareGenerationAsync(
		{ force: false, modelId: MULTI_MODEL.id, options: { count: 2 }, prompt: "a cat", references: [] },
		{ cwd: "/work", isDirectoryAsync: async () => false, models: [MULTI_MODEL], stdoutIsTty: false },
	);
}

function applyActions(actions: ReadonlyArray<SessionAction>): SessionState {
	let state = createSession("SESSION-1");
	for (const action of actions) state = reduceSession(state, action);

	return state;
}

const RESULT: GenerationResult = {
	id: "01M4YVAAAAAAAAAAAAAAAAAAA1",
	cost: 0.08,
	created: "2026-10-15T09:00:00.000Z",
	failures: [],
	images: [
		{ mediaType: "image/png", path: "/work/a-cat.png" },
		{ mediaType: "image/png", path: "/elsewhere/a-cat-2.png" },
	],
	model: MULTI_MODEL.id,
	prompt: "a cat",
	requested: 2,
	returned: 2,
};

describe("reduceSession", () => {
	it("shows a turn at once, asks to confirm it once priced, and runs it on confirmation", async ({ expect }) => {
		expect.assertions(4);

		const pending = { cost: "$0.08", prepared: await prepareAsync() };
		const confirming = applyActions([
			{ id: 1, model: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
			{ id: 1, pending, type: "prepared" },
		]);
		const running = reduceSession(confirming, { id: 1, at: 1000, type: "turn-started" });

		expect(confirming.pending?.id).toBe(1);
		expect(confirming.turns[0]).toMatchObject({ phase: TurnPhase.Confirming, requested: 2 });
		expect(running.pending).toBeUndefined();
		expect(running.turns[0]).toMatchObject({ phase: TurnPhase.Running, startedAt: 1000 });
	});

	it("drops a turn you cancel, and records a failure on its turn", async ({ expect }) => {
		expect.assertions(2);

		const pending = { cost: "$0.08", prepared: await prepareAsync() };
		const canceled = applyActions([
			{ id: 1, model: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
			{ id: 1, pending, type: "prepared" },
			{ type: "dismiss" },
		]);
		const failed = applyActions([
			{ id: 2, model: "missing/model", prompt: "a dog", type: "turn-added" },
			{ id: 2, at: 5, error: "Unknown model.", type: "turn-failed" },
		]);

		expect(canceled.turns).toHaveLength(0);
		expect(failed.turns[0]).toMatchObject({ error: "Unknown model.", phase: TurnPhase.Failed });
	});
});

describe("turn-removed", () => {
	it("drops the turn, and edits the newest image left when its image was the base", ({ expect }) => {
		expect.assertions(2);

		const older = { ...RESULT, images: [{ mediaType: "image/png", path: "/work/older.png" }] };
		const state = applyActions([
			{ id: 1, model: MULTI_MODEL.id, prompt: "a dog", type: "turn-added" },
			{ id: 1, at: 1, result: older, type: "turn-done" },
			{ id: 2, model: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
			{ id: 2, at: 2, result: RESULT, type: "turn-done" },
			{ id: 2, type: "turn-removed" },
		]);

		expect(state.turns.map(({ id }) => id)).toStrictEqual([1]);
		expect(state.base?.path).toBe("/work/older.png");
	});
});

describe("getEditBase", () => {
	it("edits the newest image, or the one you chose, until you switch to starting fresh", ({ expect }) => {
		expect.assertions(4);

		const done = applyActions([
			{ id: 1, model: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
			{ id: 1, at: 5, result: RESULT, type: "turn-done" },
		]);
		const chosen = reduceSession(done, {
			image: { mediaType: "image/png", path: "/elsewhere/a-cat-2.png" },
			type: "choose-base",
		});
		const fresh = reduceSession(chosen, { mode: PromptMode.New, type: "set-mode" });

		expect(getEditBase(createSession("S"))).toBeUndefined();
		expect(getEditBase(done)?.path).toBe("/work/a-cat.png");
		expect(getEditBase(chosen)?.path).toBe("/elsewhere/a-cat-2.png");
		expect(getEditBase(fresh)).toBeUndefined();
	});

	it("resumes a session editing its newest image", ({ expect }) => {
		expect.assertions(1);

		const turn = {
			id: 1,
			model: "m",
			phase: TurnPhase.Done,
			prompt: "a cat",
			requested: 2,
			result: RESULT,
			warnings: [],
		};

		expect(getEditBase(createSession("S", [turn]))?.path).toBe("/work/a-cat.png");
	});
});

describe("summarizeTurn", () => {
	it("gives the model, time, and cost of a finished turn", ({ expect }) => {
		expect.assertions(1);

		const turn = {
			id: 1,
			finishedAt: 15_200,
			model: "Test Multi",
			phase: TurnPhase.Done,
			prompt: "a cat",
			requested: 2,
			result: RESULT,
			startedAt: 1000,
			warnings: [],
		};

		expect(summarizeTurn(turn, "Test Multi")).toBe("Test Multi · 14.2s · $0.08");
	});

	it("says when fewer images came back than were asked for", ({ expect }) => {
		expect.assertions(1);

		const turn = {
			id: 1,
			model: "Test Multi",
			phase: TurnPhase.Done,
			prompt: "a cat",
			requested: 2,
			result: { ...RESULT, returned: 1 },
			warnings: [],
		};

		expect(summarizeTurn(turn, "Test Multi")).toBe("Test Multi · $0.08 · 1 of 2 images");
	});
});
