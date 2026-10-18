import { reduceStatus } from "$interactive/components/status-message";

import { EMPTY_EDITOR, reducePromptEditor } from "./prompt-editor-state";

import type { StatusAction, StatusMessage } from "$interactive/components/status-message";
import type { BaseImage, SessionTurn } from "$interactive/session/session-state";

import type { EditorAction, PromptEditor } from "./prompt-editor-state";

/** A dialog over the generate screen. */
export const enum GenerateDialog {
	/** Whether to delete a turn and its images. */
	Delete = "delete",
	/** What to do with an image you clicked. */
	Image = "image",
	Model = "model",
	/** What to do with a prompt you clicked. */
	Prompt = "prompt",
	Sessions = "sessions",
}

/** The dialog open over the generate screen, with what it is about. */
export type OpenDialog =
	| { readonly image: BaseImage; readonly kind: GenerateDialog.Image }
	| { readonly kind: GenerateDialog.Delete; readonly turn: SessionTurn }
	| { readonly kind: GenerateDialog.Model }
	| { readonly kind: GenerateDialog.Prompt; readonly turn: SessionTurn }
	| { readonly kind: GenerateDialog.Sessions };

export interface GenerateScreenState {
	/** The dialog open over the prompt box, if any. */
	readonly dialog?: OpenDialog | undefined;
	readonly editor: PromptEditor;
	readonly status?: StatusMessage | undefined;
}

export type GenerateScreenAction =
	| StatusAction
	| { readonly action: EditorAction; readonly type: "edit" }
	| { readonly dialog: OpenDialog | undefined; readonly type: "dialog" };

export const INITIAL_GENERATE_STATE: GenerateScreenState = { editor: EMPTY_EDITOR };

/**
 * Applies one action to the generate screen.
 *
 * @param state - The prompt, the open dialog, and the toast.
 * @param action - An edit, a dialog opening or closing, or a toast.
 * @returns The next state.
 */
export function reduceGenerateScreen(state: GenerateScreenState, action: GenerateScreenAction): GenerateScreenState {
	switch (action.type) {
		case "dialog":
			return { ...state, dialog: action.dialog };
		case "edit":
			return { ...state, editor: reducePromptEditor(state.editor, action.action) };
		default:
			return { ...state, status: reduceStatus(state.status, action) };
	}
}
