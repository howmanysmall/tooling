import { TextInput } from "@inkjs/ui";
import { Box, Text } from "ink";

import { SHORT_ID_LENGTH } from "$history/resolve-run-reference";

import { BrowserMode } from "./history-browser-state";

import type { Dispatch, ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

import type { BrowserAction, BrowserState } from "./history-browser-state";

export interface HistoryBrowserFooterProperties {
	readonly dispatch: Dispatch<BrowserAction>;
	readonly selected: HistoryEntry | undefined;
	readonly state: BrowserState;
}

const HELP = "↑↓ move · / filter · enter open · y copy id · r rerun · d delete · q quit";
const BACK_TO_LIST: BrowserAction = { mode: BrowserMode.Normal, type: "mode" };

/**
 * The browser's bottom line: the filter input, the delete question, the last
 * status message, or the key bindings.
 *
 * @param properties - The browser state and where to send filter changes.
 * @param properties.dispatch - Sends filter changes to the browser.
 * @param properties.selected - The selected run, for the delete question.
 * @param properties.state - The mode, filter, and status.
 * @returns One line of text, or the filter input.
 */
export function HistoryBrowserFooter({ dispatch, selected, state }: HistoryBrowserFooterProperties): ReactNode {
	if (state.mode === BrowserMode.Filter) {
		return (
			<Box>
				<Text color="cyan">{"/ "}</Text>
				<TextInput
					defaultValue={state.filter}
					placeholder="filter by prompt or model"
					onChange={(filter): void => {
						dispatch({ filter, type: "filter" });
					}}
					onSubmit={(): void => {
						dispatch(BACK_TO_LIST);
					}}
				/>
			</Box>
		);
	}
	if (selected !== undefined && state.mode === BrowserMode.ConfirmDelete) {
		const question = `Delete run ${selected.id.slice(0, SHORT_ID_LENGTH)} and its stored images? (y/N)`;
		return <Text color="yellow">{question}</Text>;
	}
	return <Text dimColor={state.status === undefined}>{state.status ?? HELP}</Text>;
}
