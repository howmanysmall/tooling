import { describe, it } from "vitest";

import { describeSettledRun } from "./finish-running.ts";

import type { GenerationResult } from "$generation/run-generation";

const RESULT: GenerationResult = {
	id: "01M4YVAAAAAAAAAAAAAAAAAAA1",
	cost: 0.04,
	created: "2026-10-15T09:00:00.000Z",
	failures: [],
	images: [
		{ mediaType: "image/png", path: "/work/a-fox.png" },
		{ mediaType: "image/png", path: undefined },
	],
	model: "test/multi",
	prompt: "a fox",
	requested: 2,
	returned: 2,
};

describe("describeSettledRun", () => {
	it("reports a saved run's summary and each saved path", ({ expect }) => {
		expect.assertions(1);

		expect(describeSettledRun({ prompt: "a fox", result: RESULT }, "/work")).toStrictEqual([
			{ level: "success", text: "2 images · test/multi · $0.04" },
			{ level: "info", text: "./a-fox.png" },
		]);
	});

	it("reports why a run failed", ({ expect }) => {
		expect.assertions(1);

		expect(describeSettledRun({ error: "OpenRouter returned 500.", prompt: "a fox" }, "/work")).toStrictEqual([
			{ level: "error", text: "a fox: OpenRouter returned 500." },
		]);
	});
});
