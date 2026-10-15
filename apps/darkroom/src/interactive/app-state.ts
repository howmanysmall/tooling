import { AppTab, cycleTab } from "./app-tab";

export interface AppState {
	/** The model picked in this session, in the models tab or the picker. */
	readonly chosenModelId?: string | undefined;
	readonly tab: AppTab;
}

export type AppAction =
	| { readonly delta: number; readonly type: "cycle" }
	| { readonly id: string; readonly type: "choose-model" }
	| { readonly tab: AppTab; readonly type: "select" };

/**
 * Applies one action to the app. Choosing a model anywhere takes you to the
 * prompt box with it.
 *
 * @param state - The tab and the chosen model.
 * @param action - A tab switch or a chosen model.
 * @returns The next state.
 */
export function reduceAppState(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "choose-model":
			return { chosenModelId: action.id, tab: AppTab.Generate };
		case "cycle":
			return { ...state, tab: cycleTab(state.tab, action.delta) };
		default:
			return { ...state, tab: action.tab };
	}
}
