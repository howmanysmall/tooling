import { describe, it } from "vitest";

import { createModel } from "$generation/model-fixture";
import { createEntry } from "$history/history-fixture";

import { getModelMatches, getRecentModelIds, pickModel } from "./model-picker-state";

const BANANA = { ...createModel("google/banana", {}), name: "Google: Nano Banana" };
const FLUX = { ...createModel("bfl/flux", {}), name: "Black Forest Labs: Flux" };
const IMAGE = { ...createModel("openai/gpt-image-1", {}), name: "OpenAI: GPT Image 1" };
const MODELS = [IMAGE, BANANA, FLUX];

function getIds(matches: ReadonlyArray<{ readonly model: { readonly id: string } }>): Array<string> {
	return matches.map(({ model }) => model.id);
}

describe("getRecentModelIds", () => {
	it("lists each recent model once, most recent first", ({ expect }) => {
		expect.assertions(1);

		const entries = [
			createEntry("c", { model: "google/banana" }),
			createEntry("b", { model: "bfl/flux" }),
			createEntry("a", { model: "google/banana" }),
		];

		expect(getRecentModelIds(entries)).toStrictEqual(["google/banana", "bfl/flux"]);
	});
});

describe("pickModel", () => {
	it("prefers the chosen model, then DARKROOM_MODEL, then the last used", ({ expect }) => {
		expect.assertions(4);

		const recent = ["bfl/flux"];

		expect(pickModel(MODELS, { chosen: "google/banana", preferred: "bfl/flux", recent })?.id).toBe("google/banana");
		expect(pickModel(MODELS, { preferred: "missing/model", recent })?.id).toBe("bfl/flux");
		expect(pickModel(MODELS, { recent: [] })?.id).toBe("openai/gpt-image-1");
		expect(pickModel([], { recent })).toBeUndefined();
	});
});

describe("getModelMatches", () => {
	it("lists recent models first, then the rest by name", ({ expect }) => {
		expect.assertions(2);

		const matches = getModelMatches(MODELS, ["openai/gpt-image-1"], " ");

		expect(getIds(matches)).toStrictEqual(["openai/gpt-image-1", "bfl/flux", "google/banana"]);
		expect(matches.map(({ isRecent }) => isRecent)).toStrictEqual([true, false, false]);
	});

	it("matches the ID too, but highlights only the name", ({ expect }) => {
		expect.assertions(3);

		const [byName] = getModelMatches(MODELS, [], "banana");
		const [byId] = getModelMatches(MODELS, [], "bfl/");

		expect(byName?.model.id).toBe("google/banana");
		expect(byName?.positions).toStrictEqual(new Set([13, 14, 15, 16, 17, 18]));
		expect(byId?.positions.size).toBe(0);
	});
});
