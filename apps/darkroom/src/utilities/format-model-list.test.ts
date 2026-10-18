import { describe, it } from "vitest";

import { MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";
import { OutputFormat } from "$validators/output-format-type";

import { formatModelList } from "./format-model-list";

const MODELS = [MULTI_MODEL, SINGLE_MODEL];
const PRICING = {
	"test/multi": [{ pricing: [{ billable: "output_image", costUsd: 0.04, unit: "image" }], provider: "openai" }],
};

describe("formatModelList", () => {
	it("prints one ID per line when piped without --format", ({ expect }) => {
		expect.assertions(1);

		expect(formatModelList(MODELS, PRICING, undefined, false)).toBe("test/multi\ntest/single");
	});

	it("shows a table with prices, reference limits, and counts on a terminal", ({ expect }) => {
		expect.assertions(3);

		const table = formatModelList(MODELS, PRICING, undefined, true);

		expect(table).toContain("$0.04/img");
		expect(table).toContain("≤16");
		expect(table).toContain("Count");
	});

	it("includes each model's prices in JSON", ({ expect }) => {
		expect.assertions(1);

		const models = JSON.parse(formatModelList(MODELS, PRICING, OutputFormat.JsonMinified, true));

		expect(models).toMatchObject([
			{ id: "test/multi", pricing: PRICING["test/multi"] },
			{ id: "test/single", pricing: [] },
		]);
	});

	it("aligns columns without a border in the pretty format", ({ expect }) => {
		expect.assertions(1);

		expect(formatModelList(MODELS, PRICING, OutputFormat.Pretty, true)).not.toContain("│");
	});
});
