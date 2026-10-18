import { describe, it } from "vitest";
import ansis from "ansis";

import { createSession, TurnPhase } from "$interactive/session/session-state";

import { formatExitSummary } from "./exit-summary";

const ID = "01SESSIONCATSAAAAAAAAAAAA1";

describe("formatExitSummary", () => {
	it("names the session and how to resume it", ({ expect }) => {
		expect.assertions(2);

		const turn = {
			id: 1,
			model: "m",
			phase: TurnPhase.Done,
			prompt: "a cat\nin a hat",
			requested: 1,
			warnings: [],
		};
		const session = createSession(ID, [turn]);
		const summary = ansis.strip(String(formatExitSummary(session, "darkroom")));

		expect(summary).toContain("Session   a cat in a hat");
		expect(summary).toContain(`Continue  darkroom -s ${ID}`);
	});

	it("says nothing for a session with nothing saved", ({ expect }) => {
		expect.assertions(1);

		const failed = { id: 1, model: "m", phase: TurnPhase.Failed, prompt: "a cat", requested: 1, warnings: [] };

		expect(formatExitSummary(createSession(ID, [failed]), "darkroom")).toBeUndefined();
	});
});
