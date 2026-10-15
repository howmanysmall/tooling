import { describe, it } from "vitest";

import { createModel, MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";

import { filterModels, ModelSort, sortModels } from "./model-filters";

const MODELS = [
	MULTI_MODEL,
	SINGLE_MODEL,
	createModel("google/banana", {
		aspect_ratio: { type: "enum", values: ["1:1", "21:9"] },
		input_references: { max: 14, min: 0, type: "range" },
	}),
];

function getIds(models: ReadonlyArray<{ readonly id: string }>): Array<string> {
	return models.map((model) => model.id);
}

describe("filterModels", () => {
	it("matches search text against the ID, name, and description", ({ expect }) => {
		expect.assertions(2);

		expect(getIds(filterModels(MODELS, { search: "BANANA" }))).toStrictEqual(["google/banana"]);
		expect(getIds(filterModels(MODELS, { search: "for tests" }))).toHaveLength(3);
	});

	it("filters by provider, references, count, ratio, and transparency", ({ expect }) => {
		expect.assertions(5);

		expect(getIds(filterModels(MODELS, { provider: "Google" }))).toStrictEqual(["google/banana"]);
		expect(getIds(filterModels(MODELS, { refs: true }))).toStrictEqual(["test/multi", "google/banana"]);
		expect(getIds(filterModels(MODELS, { multi: true }))).toStrictEqual(["test/multi"]);
		expect(getIds(filterModels(MODELS, { ratio: "21:9" }))).toStrictEqual(["google/banana"]);
		expect(getIds(filterModels(MODELS, { transparent: true }))).toStrictEqual(["test/multi"]);
	});
});

describe("sortModels", () => {
	it("sorts per-image prices before other units and unpriced models last", ({ expect }) => {
		expect.assertions(1);

		const pricing = {
			"google/banana": [
				{ pricing: [{ billable: "output_image", costUsd: 0.000_03, unit: "token" }], provider: "g" },
			],
			"test/multi": [{ pricing: [{ billable: "output_image", costUsd: 0.04, unit: "image" }], provider: "o" }],
		};

		expect(getIds(sortModels(MODELS, ModelSort.Price, pricing))).toStrictEqual([
			"test/multi",
			"google/banana",
			"test/single",
		]);
	});

	it("sorts by name", ({ expect }) => {
		expect.assertions(1);

		expect(getIds(sortModels(MODELS, ModelSort.Name, {}))).toStrictEqual([
			"google/banana",
			"test/multi",
			"test/single",
		]);
	});
});
