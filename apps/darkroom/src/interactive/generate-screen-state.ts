import { EMPTY_EDITOR, reducePromptEditor } from "./prompt-editor-state";
import { reduceStatus } from "./status-message";

import type { EditorAction, PromptEditor } from "./prompt-editor-state";
import type { StatusAction, StatusMessage } from "./status-message";

export interface GenerateScreenState {
	readonly editor: PromptEditor;
	/** Whether the model picker is open over the prompt box. */
	readonly isPicking: boolean;
	readonly status?: StatusMessage | undefined;
}

export type GenerateScreenAction =
	| StatusAction
	| { readonly action: EditorAction; readonly type: "edit" }
	| { readonly isPicking: boolean; readonly type: "picking" };

export const INITIAL_GENERATE_STATE: GenerateScreenState = { editor: EMPTY_EDITOR, isPicking: false };

/**
 * Applies one action to the generate screen.
 *
 * @param state - The prompt, the picker, and the toast.
 * @param action - An edit, the picker opening or closing, or a toast.
 * @returns The next state.
 */
export function reduceGenerateScreen(state: GenerateScreenState, action: GenerateScreenAction): GenerateScreenState {
	switch (action.type) {
		case "edit":
			return { ...state, editor: reducePromptEditor(state.editor, action.action) };
		case "picking":
			return { ...state, isPicking: action.isPicking };
		default:
			return { ...state, status: reduceStatus(state.status, action) };
	}
}
