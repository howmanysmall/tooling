import { BrowserShell } from "$interactive/app/browser-shell";

import { useHistoryBrowser } from "./history-browser-context";
import { BrowserMode } from "./history-browser-state";
import { getHistoryCommands } from "./history-commands";
import { HistoryDeleteDialog } from "./history-delete-dialog";

import type { Key } from "ink";
import type { ReactNode } from "react";

import type { HistoryBrowserActions } from "./history-browser-context";

export interface HistoryBrowserFrameProperties {
	children: ReactNode;
}

/**
 * Picks who reads the keys: the delete question takes the next key as its
 * answer, and while filtering the input reads the typing, so only Esc is
 * left for the browser.
 *
 * @param mode - What the browser is doing.
 * @param actions - The browser's actions.
 * @returns The key reader, or `undefined` to use the usual bindings.
 */
function getCapture(
	mode: BrowserMode,
	actions: HistoryBrowserActions,
): ((input: string, key: Key) => void) | undefined {
	if (mode === BrowserMode.ConfirmDelete) {
		return (input) => {
			actions.answerDelete(input);
		};
	}

	if (mode !== BrowserMode.Filter) return undefined;

	return (_input, key) => {
		if (key.escape) actions.cancelFilter();
	};
}

/**
 * The history browser's frame: the shared shell with the browser's commands,
 * and the delete question while it is asked.
 *
 * @param properties - The parts to lay out.
 * @param properties.children - The header, panes, and status bar.
 * @returns A box the size of the terminal.
 */
export function HistoryBrowserFrame({ children }: Readonly<HistoryBrowserFrameProperties>): ReactNode {
	const {
		actions,
		meta: { layout },
		state,
	} = useHistoryBrowser();

	return (
		<BrowserShell
			capture={getCapture(state.mode, actions)}
			columns={layout.columns}
			commands={getHistoryCommands(actions)}
			rows={layout.rows}
			status={state.status}
		>
			{children}
			{state.mode === BrowserMode.ConfirmDelete ? <HistoryDeleteDialog /> : null}
		</BrowserShell>
	);
}
