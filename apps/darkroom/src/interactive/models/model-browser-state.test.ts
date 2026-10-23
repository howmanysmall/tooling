import { describe, it } from "vitest";

import { createModel } from "$generation/model-fixture";
import { CursorMoveType } from "$interactive/components/list-cursor";
import { ModelSort } from "$utilities/model-filters";

import {
	createModelBrowserState,
	getExample,
	getVisibleModels,
	ModelBrowserActionType,
	reduceModelBrowserState,
} from "./model-browser-state";
import { ExampleSource } from "./model-examples";

import type { EndpointPricing } from "$generation/cost-estimate";

import type { ModelBrowserAction, ModelBrowserState } from "./model-browser-state";
import type { ModelExample } from "./model-examples";

const CHEAP = { ...createModel("alpha/cheap", {}), name: "Alpha: Cheap" };
const DEAR = { ...createModel("beta/dear", {}), name: "Beta: Dear" };
const MIDDLE = { ...createModel("gamma/middle", {}), name: "Gamma: Middle" };

function createPrice(costUsd: number): Array<EndpointPricing> {
	return [{ pricing: [{ billable: "output_image", costUsd, unit: "image" }], provider: "test" }];
}

const YOURS: ModelExample = { path: "/data/1.png", prompt: "a fox", source: ExampleSource.Yours };
const SHIPPED: ModelExample = { path: "/examples/1.avif", prompt: "a stall", source: ExampleSource.Shipped };

// Cheap has both kinds of example; Dear has only the shipped one.
const STATE = createModelBrowserState(
	{
		models: [MIDDLE, DEAR, CHEAP],
		observed: new Map(),
		pricing: { [CHEAP.id]: createPrice(0.01), [DEAR.id]: createPrice(0.2), [MIDDLE.id]: createPrice(0.05) },
		shippedExamples: new Map([
			[CHEAP.id, SHIPPED],
			[DEAR.id, SHIPPED],
		]),
		yourExamples: new Map([[CHEAP.id, YOURS]]),
	},
	ModelSort.Name,
);

function apply(state: ModelBrowserState, ...actions: ReadonlyArray<ModelBrowserAction>): ModelBrowserState {
	let next = state;
	for (const action of actions) next = reduceModelBrowserState(next, action);

	return next;
}

function getIds(state: ModelBrowserState): ReadonlyArray<string> {
	return getVisibleModels(state).map((model) => model.id);
}

describe("model browser state", () => {
	it("lists the models in the chosen order", ({ expect }) => {
		expect.assertions(1);

		expect(getIds(STATE)).toStrictEqual([CHEAP.id, DEAR.id, MIDDLE.id]);
	});

	it("keeps the same model selected when the sort changes", ({ expect }) => {
		expect.assertions(2);

		const sorted = apply(STATE, { delta: 2, type: CursorMoveType.Move }, { type: ModelBrowserActionType.NextSort });

		expect(sorted.sort).toBe(ModelSort.Price);
		expect(getVisibleModels(sorted)[sorted.cursor]?.id).toBe(MIDDLE.id);
	});

	it("filters while typing and clears on cancel", ({ expect }) => {
		expect.assertions(2);

		const filtered = apply(
			STATE,
			{ isFiltering: true, type: ModelBrowserActionType.Filtering },
			{ filter: " dear ", type: ModelBrowserActionType.Filter },
		);

		expect(getIds(filtered)).toStrictEqual([DEAR.id]);
		expect(getIds(apply(filtered, { type: ModelBrowserActionType.CancelFilter }))).toHaveLength(3);
	});

	it("ignores filter text that arrives after the filter closed", ({ expect }) => {
		expect.assertions(1);

		expect(apply(STATE, { filter: "dear", type: ModelBrowserActionType.Filter })).toBe(STATE);
	});

	it("shows your image first, the shipped one on e, and whichever exists otherwise", ({ expect }) => {
		expect.assertions(4);

		const switched = apply(STATE, { type: ModelBrowserActionType.SwitchExample });

		expect(getExample(STATE, CHEAP.id)).toBe(YOURS);
		expect(getExample(switched, CHEAP.id)).toBe(SHIPPED);
		expect(getExample(STATE, DEAR.id)).toBe(SHIPPED);
		expect(getExample(STATE, MIDDLE.id)).toBeUndefined();
	});
});
