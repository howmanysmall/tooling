import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatClipboardSequence } from "./history-browser-keys";
import { BrowserMode } from "./history-browser-state";
import { runBrowserTask } from "./run-browser-task";

import type { Dispatch } from "react";

import type { HistoryEntry } from "$history/history-entry";

import type { HistoryBrowserActions } from "./history-browser-context";
import type { BrowserServices } from "./history-browser-services";
import type { BrowserAction } from "./history-browser-state";

export interface ActionEnvironment {
	readonly dispatch: Dispatch<BrowserAction>;
	/** Closes the browser. */
	readonly exit: () => void;
	/** Rows of runs a page holds. */
	readonly pageSize: number;
	readonly selected?: HistoryEntry | undefined;
	readonly services: BrowserServices;
	/** Writes escape sequences straight to the terminal. */
	readonly write: (data: string) => void;
}

const MOVE_DOWN: BrowserAction = { delta: 1, type: "move" };
const MOVE_UP: BrowserAction = { delta: -1, type: "move" };
const MOVE_FIRST: BrowserAction = { type: "first" };
const MOVE_LAST: BrowserAction = { type: "last" };
const OPEN_FILTER: BrowserAction = { mode: BrowserMode.Filter, type: "mode" };
const CANCEL_FILTER: BrowserAction = { type: "cancel-filter" };
const ASK_DELETE: BrowserAction = { mode: BrowserMode.ConfirmDelete, type: "mode" };
const BACK_TO_LIST: BrowserAction = { mode: BrowserMode.Normal, type: "mode" };

/**
 * Builds what the browser's keys and inputs can do. Each action that touches
 * the disk reports its outcome in the footer instead of throwing.
 *
 * @param environment - The reducer, the selected run, and the services.
 * @param environment.dispatch - Sends actions to the browser reducer.
 * @param environment.exit - Closes the browser.
 * @param environment.pageSize - Rows of runs a page holds.
 * @param environment.selected - The run under the cursor, if any.
 * @param environment.services - Deletes, opens, and re-runs runs.
 * @param environment.write - Writes escape sequences to the terminal.
 * @returns The actions for the browser context.
 */
export function createBrowserActions({
	dispatch,
	exit,
	pageSize,
	selected,
	services,
	write,
}: ActionEnvironment): HistoryBrowserActions {
	function reportSuccess(text: string): void {
		dispatch({ status: { text, tone: "success" }, type: "status" });
	}

	function reportError(text: string): void {
		dispatch({ status: { text, tone: "error" }, type: "status" });
	}

	return {
		answerDelete(answer): void {
			if (answer !== "y" || selected === undefined) {
				dispatch(BACK_TO_LIST);
				return;
			}

			const { id } = selected;
			runBrowserTask(services.deleteRunAsync(selected), (failure) => {
				if (failure === undefined) dispatch({ id, type: "removed" });
				else reportError(`Could not delete: ${failure}`);
			});
		},
		askDelete(): void {
			if (selected !== undefined) dispatch(ASK_DELETE);
		},
		cancelFilter(): void {
			dispatch(CANCEL_FILTER);
		},
		closeFilter(): void {
			dispatch(BACK_TO_LIST);
		},
		copySelected(): void {
			if (selected === undefined) return;

			write(formatClipboardSequence(selected.id));
			reportSuccess(`Copied ${selected.id}`);
		},
		moveDown(): void {
			dispatch(MOVE_DOWN);
		},
		movePageDown(): void {
			dispatch({ delta: pageSize, type: "move" });
		},
		movePageUp(): void {
			dispatch({ delta: -pageSize, type: "move" });
		},
		moveToFirst(): void {
			dispatch(MOVE_FIRST);
		},
		moveToLast(): void {
			dispatch(MOVE_LAST);
		},
		moveUp(): void {
			dispatch(MOVE_UP);
		},
		openFilter(): void {
			dispatch(OPEN_FILTER);
		},
		openSelected(): void {
			if (selected === undefined) return;

			const count = selected.images.length;
			runBrowserTask(services.openRunAsync(selected), (failure) => {
				if (failure === undefined) reportSuccess(`Opened ${count} ${toPlural(count, "image")}`);
				else reportError(`Could not open: ${failure}`);
			});
		},
		quit(): void {
			exit();
		},
		rerunSelected(): void {
			if (selected === undefined) return;

			services.requestRerun(selected);
			exit();
		},
		setFilter(text): void {
			dispatch({ filter: text, type: "filter" });
		},
	};
}
