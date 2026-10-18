import nodePath from "node:path";
import { stripVTControlCharacters } from "node:util";
import { describe, it } from "vitest";

import { OutputFormat } from "$validators/output-format-type";

import {
	describeFailures,
	formatComparePlan,
	formatCompareResult,
	formatCompareSummary,
	formatOutcomeLine,
} from "./compare-format";

import type { GenerationResult } from "$generation/run-generation";

import type { CompareOutcome } from "./compare-format";

const CWD = "/work";

function createResult(model: string, cost: number): GenerationResult {
	return {
		id: `01M4YV${model.length}AAAAAAAAAAAAAAAAAAA`,
		cost,
		created: "2026-10-15T00:00:00.000Z",
		failures: [],
		images: [{ mediaType: "image/png", path: nodePath.join(CWD, "cmp", `${model.replace("/", "_")}_1.png`) }],
		model,
		prompt: "a cat",
		requested: 1,
		returned: 1,
	};
}

const OK: CompareOutcome = { elapsedMs: 4200, model: "b/two", result: createResult("b/two", 0.018), status: "ok" };
const FAILED: CompareOutcome = { elapsedMs: 900, error: "The model refused.", model: "a/one", status: "failed" };
const REPORT = { batch: "01M4YVBATCHAAAAAAAAAAAAAAA", outcomes: [FAILED, OK], prompt: "a cat" };

describe("formatOutcomeLine", () => {
	it("shows images, cost, and time for a success, and the reason for a failure", ({ expect }) => {
		expect.assertions(2);

		expect(stripVTControlCharacters(formatOutcomeLine(OK))).toBe("✔ b/two · 1 image · $0.018 · 4.2s");
		expect(stripVTControlCharacters(formatOutcomeLine(FAILED))).toBe("✖ a/one · The model refused.");
	});
});

describe("formatCompareSummary", () => {
	it("counts the models that succeeded and adds up what was spent", ({ expect }) => {
		expect.assertions(1);

		expect(stripVTControlCharacters(formatCompareSummary([FAILED, OK]))).toBe("✖ 1 of 2 models · 1 image · $0.018");
	});
});

describe("formatCompareResult", () => {
	it("prints saved paths in the order the models were given", ({ expect }) => {
		expect.assertions(1);

		expect(formatCompareResult(REPORT, OutputFormat.Pretty, CWD)).toBe("./cmp/b_two_1.png");
	});

	it("reports every model in JSON, failures included", ({ expect }) => {
		expect.assertions(1);

		const json = JSON.parse(String(formatCompareResult(REPORT, OutputFormat.JsonMinified, CWD)));

		expect(json).toMatchObject({
			batch: REPORT.batch,
			cost: 0.018,
			results: [
				{ error: "The model refused.", model: "a/one", status: "failed" },
				{ model: "b/two", returned: 1, status: "ok" },
			],
		});
	});
});

describe("formatComparePlan", () => {
	it("lines up each model's count and cost above the total", ({ expect }) => {
		expect.assertions(1);

		const rows = [
			{ cost: "$0.007", count: 1, model: "recraft/v4" },
			{ cost: "$0.018", count: 2, model: "seed/dream" },
		];

		expect(formatComparePlan("a cat", rows, "$0.043")).toBe(
			["prompt  a cat", "", "recraft/v4   1  $0.007", "seed/dream   2  $0.018", "total        3  $0.043"].join(
				"\n",
			),
		);
	});
});

describe("describeFailures", () => {
	it("says how many models failed, and nothing when none did", ({ expect }) => {
		expect.assertions(3);

		expect(describeFailures([FAILED, OK])).toBe("1 of 2 models failed; the other models' images were saved.");
		expect(describeFailures([FAILED, FAILED])).toBe("All 2 models failed.");
		expect(describeFailures([OK])).toBeUndefined();
	});
});
