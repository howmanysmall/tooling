import { describe, it } from "vitest";

import { reduceAppState } from "./app-state";
import { AppTab, cycleTab } from "./app-tab";

describe("cycleTab", () => {
	it("steps through the tabs and wraps at either end", ({ expect }) => {
		expect.assertions(3);

		expect(cycleTab(AppTab.Generate, 1)).toBe(AppTab.History);
		expect(cycleTab(AppTab.Models, 1)).toBe(AppTab.Generate);
		expect(cycleTab(AppTab.Generate, -1)).toBe(AppTab.Models);
	});
});

describe("reduceAppState", () => {
	it("goes to the prompt box with a model chosen anywhere", ({ expect }) => {
		expect.assertions(2);

		const state = reduceAppState({ tab: AppTab.Models }, { id: "google/banana", type: "choose-model" });

		expect(state).toStrictEqual({ chosenModelId: "google/banana", tab: AppTab.Generate });
		expect(reduceAppState(state, { tab: AppTab.History, type: "select" })).toStrictEqual({
			chosenModelId: "google/banana",
			tab: AppTab.History,
		});
	});
});
