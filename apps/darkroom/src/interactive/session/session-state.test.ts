import { describe, it } from "vitest";

import { MULTI_MODEL } from "$generation/model-fixture";
import { prepareGenerationAsync } from "$generation/run-generation";

import { INITIAL_SESSION, reduceSession, TurnPhase } from "./session-state";
import { getTurnPaths, summarizeTurn } from "./turn-summary";

import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";

import type { SessionAction, SessionState } from "./session-state";

async function prepareAsync(): Promise<PreparedGeneration> {
	return prepareGenerationAsync(
		{ force: false, modelId: MULTI_MODEL.id, options: { count: 2 }, prompt: "a cat", references: [] },
		{ cwd: "/work", isDirectoryAsync: async () => false, models: [MULTI_MODEL], stdoutIsTty: false },
	);
}

function applyActions(actions: ReadonlyArray<SessionAction>): SessionState {
	let state = INITIAL_SESSION;
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
			{ id: 1, modelName: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
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
			{ id: 1, modelName: MULTI_MODEL.id, prompt: "a cat", type: "turn-added" },
			{ id: 1, pending, type: "prepared" },
			{ type: "dismiss" },
		]);
		const failed = applyActions([
			{ id: 2, modelName: "missing/model", prompt: "a dog", type: "turn-added" },
			{ id: 2, at: 5, error: "Unknown model.", type: "turn-failed" },
		]);

		expect(canceled.turns).toHaveLength(0);
		expect(failed.turns[0]).toMatchObject({ error: "Unknown model.", phase: TurnPhase.Failed });
	});

	it("keeps running turns when starting a new session", ({ expect }) => {
		expect.assertions(1);

		const state = applyActions([
			{ id: 1, modelName: "a", prompt: "one", type: "turn-added" },
			{ id: 1, at: 5, error: "Failed.", type: "turn-failed" },
			{ id: 2, modelName: "b", prompt: "two", type: "turn-added" },
			{ type: "new-session" },
		]);

		expect(state.turns.map((turn) => turn.id)).toStrictEqual([2]);
	});
});

describe("summarizeTurn", () => {
	it("gives the model, time, and cost of a finished turn, with its saved paths", ({ expect }) => {
		expect.assertions(2);

		const turn = {
			id: 1,
			finishedAt: 15_200,
			modelName: "Test Multi",
			phase: TurnPhase.Done,
			prompt: "a cat",
			requested: 2,
			result: RESULT,
			startedAt: 1000,
			warnings: [],
		};

		expect(summarizeTurn(turn)).toBe("Test Multi · 14.2s · $0.08");
		expect(getTurnPaths(turn, "/work")).toStrictEqual(["./a-cat.png", "/elsewhere/a-cat-2.png"]);
	});

	it("says when fewer images came back than were asked for", ({ expect }) => {
		expect.assertions(1);

		const turn = {
			id: 1,
			modelName: "Test Multi",
			phase: TurnPhase.Done,
			prompt: "a cat",
			requested: 2,
			result: { ...RESULT, returned: 1 },
			warnings: [],
		};

		expect(summarizeTurn(turn)).toBe("Test Multi · $0.08 · 1 of 2 images");
	});
});
