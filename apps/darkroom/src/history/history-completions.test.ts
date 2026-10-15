import { describe, it } from "vitest";

import { Shell } from "$utilities/completion-context";

import { findRunSummary, formatRunCompletions, parseRunSummaries } from "./history-completions.ts";
import { createEntry } from "./history-fixture.ts";

const CONTENT = [
	JSON.stringify(createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a cat\nin a hat" })),
	"{broken",
	JSON.stringify(createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { model: "google/gemini" })),
	"",
].join("\n");

describe("run ID completions", () => {
	it("offers last and every ID, newest first", ({ expect }) => {
		expect.assertions(1);

		expect(formatRunCompletions(parseRunSummaries(CONTENT), Shell.Zsh)).toStrictEqual([
			"last",
			"01M4YVAAAAAAAAAAAAAAAAAAA2",
			"01M4YVAAAAAAAAAAAAAAAAAAA1",
		]);
	});

	it("adds a date, model, and prompt description for fish", ({ expect }) => {
		expect.assertions(1);

		expect(formatRunCompletions(parseRunSummaries(CONTENT), Shell.Fish).at(-1)).toBe(
			"01M4YVAAAAAAAAAAAAAAAAAAA1\t2026-10-14 · openai/gpt-image-1 · a cat in a hat",
		);
	});

	it("finds the run a rerun argument names, for model-aware completion", ({ expect }) => {
		expect.assertions(3);

		const summaries = parseRunSummaries(CONTENT);

		expect(findRunSummary(summaries, "last")?.model).toBe("google/gemini");
		expect(findRunSummary(summaries, "last~1")?.model).toBe("openai/gpt-image-1");
		expect(findRunSummary(summaries, "01M4YVAAAAAA")).toBeUndefined();
	});
});
