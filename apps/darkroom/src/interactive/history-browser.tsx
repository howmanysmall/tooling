import { useReducer } from "react";
import { Box, Text, useApp, useInput, useStdout, useWindowSize } from "ink";

import { HistoryBrowserFooter } from "./history-browser-footer";
import { BrowserKey, formatClipboardSequence, getBrowserKey } from "./history-browser-keys";
import {
	BrowserMode,
	createBrowserState,
	getSelectedRun,
	getVisibleRuns,
	reduceBrowserState,
} from "./history-browser-state";
import { HistoryRunDetail } from "./history-run-detail";
import { HistoryRunList } from "./history-run-list";
import { runBrowserTask } from "./run-browser-task";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";

import type { BrowserAction } from "./history-browser-state";

export interface BrowserServices {
	/** Removes a run and its stored files. */
	readonly deleteRunAsync: (entry: HistoryEntry) => Promise<void>;
	/** Loads an image preview, or `undefined` when previews are off. */
	readonly getPreview: (path: string, box: CellBox) => LoadingPreview | undefined;
	/** Opens a run's images in the system viewer. */
	readonly openRunAsync: (entry: HistoryEntry) => Promise<void>;
	/** Remembers the run to repeat once the browser has closed. */
	readonly requestRerun: (entry: HistoryEntry) => void;
	/** Turns a stored path into an absolute one. */
	readonly resolve: (stored: string) => string;
}

export interface HistoryBrowserProperties {
	/** Every run, newest first. */
	entries: ReadonlyArray<HistoryEntry>;
	services: BrowserServices;
}

// The title, the footer, and the list's top and bottom borders.
const CHROME_ROWS = 4;

const LIST_ACTIONS: ReadonlyMap<BrowserKey, BrowserAction> = new Map<BrowserKey, BrowserAction>([
	[BrowserKey.Down, { delta: 1, type: "move" }],
	[BrowserKey.Filter, { mode: BrowserMode.Filter, type: "mode" }],
	[BrowserKey.First, { type: "first" }],
	[BrowserKey.Last, { type: "last" }],
	[BrowserKey.Up, { delta: -1, type: "move" }],
]);
const CANCEL_FILTER: BrowserAction = { type: "cancel-filter" };
const ASK_DELETE: BrowserAction = { mode: BrowserMode.ConfirmDelete, type: "mode" };
const BACK_TO_LIST: BrowserAction = { mode: BrowserMode.Normal, type: "mode" };

/**
 * The full-screen history browser: a run list, the selected run's details,
 * and a footer with the keys.
 *
 * @param properties - The runs and what the keys act on.
 * @param properties.entries - Every run, newest first.
 * @param properties.services - Opens, deletes, and re-runs runs.
 * @returns The whole screen, sized to the terminal.
 */
export function HistoryBrowser({ entries, services }: Readonly<HistoryBrowserProperties>): ReactNode {
	const [state, dispatch] = useReducer(reduceBrowserState, entries, createBrowserState);
	const { exit } = useApp();
	const { write } = useStdout();
	const { columns, rows } = useWindowSize();
	const listHeight = Math.max(1, rows - CHROME_ROWS);
	const selected = getSelectedRun(state);
	const listWidth = Math.floor(columns / 2);
	// The detail pane's borders and padding take four columns.
	const previewBox: CellBox = {
		columns: Math.max(1, columns - listWidth - 4),
		rows: Math.max(3, Math.floor(listHeight / 2)),
	};
	const firstImage = selected?.images[0];
	const preview =
		firstImage === undefined ? undefined : services.getPreview(services.resolve(firstImage.stored), previewBox);

	function report(message: string): void {
		dispatch({ status: message, type: "status" });
	}

	function runSelected(entry: HistoryEntry, binding: BrowserKey): void {
		switch (binding) {
			case BrowserKey.Copy: {
				write(formatClipboardSequence(entry.id));
				report(`Copied ${entry.id}`);
				break;
			}

			case BrowserKey.Delete: {
				dispatch(ASK_DELETE);
				break;
			}

			case BrowserKey.Open: {
				runBrowserTask(services.openRunAsync(entry), (failure) => {
					report(
						failure === undefined
							? `Opened ${entry.images.length} image(s).`
							: `Could not open: ${failure}`,
					);
				});
				break;
			}

			case BrowserKey.Rerun: {
				services.requestRerun(entry);
				exit();
				break;
			}

			default:
				break;
		}
	}

	function handleListKey(binding: BrowserKey): void {
		const action = LIST_ACTIONS.get(binding);
		if (action !== undefined) dispatch(action);
		else if (binding === BrowserKey.PageDown || binding === BrowserKey.PageUp) {
			dispatch({ delta: binding === BrowserKey.PageDown ? listHeight : -listHeight, type: "move" });
		} else if (binding === BrowserKey.Quit) exit();
		else if (selected !== undefined) runSelected(selected, binding);
	}

	function confirmDelete(input: string): void {
		if (input !== "y" || selected === undefined) {
			dispatch(BACK_TO_LIST);
			return;
		}
		const { id } = selected;
		runBrowserTask(services.deleteRunAsync(selected), (failure) => {
			if (failure === undefined) dispatch({ id, type: "removed" });
			else report(`Could not delete: ${failure}`);
		});
	}

	useInput((input, key) => {
		if (state.mode === BrowserMode.Filter) {
			if (key.escape) {
				// One action, so the filter input can't re-apply its text in
				// between.
				dispatch(CANCEL_FILTER);
			}
			return;
		}
		if (state.mode === BrowserMode.ConfirmDelete) {
			confirmDelete(input);
			return;
		}
		const binding = getBrowserKey(input, key);
		if (binding !== undefined) handleListKey(binding);
	});

	const visibleCount = getVisibleRuns(state).length;
	const counts = state.filter === "" ? `${visibleCount} runs` : `${visibleCount} of ${state.entries.length} runs`;
	return (
		<Box flexDirection="column" height={rows} width={columns}>
			<Text bold={true}>
				{"darkroom history "}
				<Text dimColor={true}>{`· ${counts}`}</Text>
			</Text>
			<Box flexGrow={1}>
				<HistoryRunList height={listHeight} state={state} width={listWidth} />
				<HistoryRunDetail
					entries={state.entries}
					entry={selected}
					preview={preview}
					resolve={services.resolve}
				/>
			</Box>
			<HistoryBrowserFooter dispatch={dispatch} selected={selected} state={state} />
		</Box>
	);
}
