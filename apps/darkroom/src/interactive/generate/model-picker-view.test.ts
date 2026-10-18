import { describe, it } from "vitest";

import { createModel, MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";

import {
	describeAbilities,
	findPickerModels,
	parsePickerQuery,
	PickerFilter,
	PickerSort,
	reducePickerView,
} from "./model-picker-view";

import type { PickerContext, PickerView } from "./model-picker-view";

const OLD = { ...createModel("google/banana", {}), name: "Google: Nano Banana", created: 1 };
const MODELS = [SINGLE_MODEL, MULTI_MODEL, OLD];
const CONTEXT: PickerContext = {
	observed: new Map([
		[MULTI_MODEL.id, { images: 3, usdPerImage: 0.04 }],
		[SINGLE_MODEL.id, { images: 3, usdPerImage: 0.01 }],
	]),
	pricing: {},
	recentIds: [],
};
const RECENT: PickerView = { filters: new Set<PickerFilter>(), sort: PickerSort.Recent };

function getIds(view: PickerView, query: string): Array<string> {
	return findPickerModels(MODELS, query, view, CONTEXT).map(({ model }) => model.id);
}

describe("parsePickerQuery", () => {
	it("pulls the provider, top price, and filters out of the text", ({ expect }) => {
		expect.assertions(1);

		expect(parsePickerQuery("  @Google $0.02 +ed flash ")).toStrictEqual({
			filters: new Set([PickerFilter.Edits]),
			maxPrice: 0.02,
			provider: "google",
			text: "flash",
		});
	});
});

describe("findPickerModels", () => {
	it("keeps only models that do what the chips and the query ask", ({ expect }) => {
		expect.assertions(3);

		expect(getIds({ ...RECENT, filters: new Set([PickerFilter.Edits]) }, "")).toStrictEqual([MULTI_MODEL.id]);
		expect(getIds(RECENT, "@google")).toStrictEqual([OLD.id]);
		expect(getIds(RECENT, "$0.02")).toStrictEqual([SINGLE_MODEL.id]);
	});

	it("sorts by price or by newest, and cycles through the orders", ({ expect }) => {
		expect.assertions(3);

		expect(getIds({ ...RECENT, sort: PickerSort.Price }, "test")).toStrictEqual([SINGLE_MODEL.id, MULTI_MODEL.id]);
		// The test models were made at the same time, so they keep name order.
		expect(getIds({ ...RECENT, sort: PickerSort.Newest }, "")).toStrictEqual([
			MULTI_MODEL.id,
			SINGLE_MODEL.id,
			OLD.id,
		]);
		expect(reducePickerView(RECENT, { delta: -1, type: "cycle-sort" }).sort).toBe(PickerSort.Newest);
	});
});

describe("describeAbilities", () => {
	it("lists editing, how many images, and transparency", ({ expect }) => {
		expect.assertions(2);

		expect(describeAbilities(MULTI_MODEL)).toBe("edits · ×10 · transparent");
		expect(describeAbilities(SINGLE_MODEL)).toBe("");
	});
});
