import { formatClipboardSequence } from "./browser-keys";
import { createCursorActions } from "./cursor-actions";
import { createStatusReporter } from "./status-message";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { Dispatch } from "react";

import type { ModelBrowserActions } from "./model-browser-context";
import type { ModelBrowserAction } from "./model-browser-state";

export interface ModelActionEnvironment {
	/** Takes the model to generate with, to the prompt box. */
	readonly chooseModel: (model: ImageModelListItem) => void;
	readonly dispatch: Dispatch<ModelBrowserAction>;
	/** Closes the browser. */
	readonly exit: () => void;
	/** Rows of models a page holds. */
	readonly pageSize: number;
	readonly selected?: ImageModelListItem | undefined;
	/** Writes escape sequences straight to the terminal. */
	readonly write: (data: string) => void;
}

const OPEN_FILTER: ModelBrowserAction = { isFiltering: true, type: "filtering" };
const CLOSE_FILTER: ModelBrowserAction = { isFiltering: false, type: "filtering" };
const CANCEL_FILTER: ModelBrowserAction = { type: "cancel-filter" };
const NEXT_SORT: ModelBrowserAction = { type: "next-sort" };
const SWITCH_EXAMPLE: ModelBrowserAction = { type: "switch-example" };

/**
 * Builds what the model browser's keys and inputs can do.
 *
 * @param environment - The reducer, the selected model, and the terminal.
 * @param environment.chooseModel - Takes the model to generate with.
 * @param environment.dispatch - Sends actions to the reducer.
 * @param environment.exit - Closes the browser.
 * @param environment.pageSize - Rows of models a page holds.
 * @param environment.selected - The model under the cursor, if any.
 * @param environment.write - Writes escape sequences to the terminal.
 * @returns The actions for the browser context.
 */
export function createModelBrowserActions({
	chooseModel,
	dispatch,
	exit,
	pageSize,
	selected,
	write,
}: ModelActionEnvironment): ModelBrowserActions {
	return {
		...createCursorActions(dispatch, pageSize),
		cancelFilter(): void {
			dispatch(CANCEL_FILTER);
		},
		chooseSelected(): void {
			if (selected === undefined) return;

			chooseModel(selected);
		},
		closeFilter(): void {
			dispatch(CLOSE_FILTER);
		},
		copySelected(): void {
			if (selected === undefined) return;

			write(formatClipboardSequence(selected.id));
			createStatusReporter(dispatch).reportSuccess(`Copied ${selected.id}`);
		},
		cycleSort(): void {
			dispatch(NEXT_SORT);
		},
		openFilter(): void {
			dispatch(OPEN_FILTER);
		},
		quit(): void {
			exit();
		},
		selectModel(id): void {
			dispatch({ id, type: "select" });
		},
		setFilter(text): void {
			dispatch({ filter: text, type: "filter" });
		},
		switchExample(): void {
			dispatch(SWITCH_EXAMPLE);
		},
	};
}
