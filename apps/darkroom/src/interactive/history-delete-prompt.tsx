import { Text } from "ink";

import { SHORT_ID_LENGTH } from "$history/resolve-run-reference";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

/**
 * The footer while asking whether to delete the selected run.
 *
 * @returns The y/N question.
 */
export function HistoryDeletePrompt(): ReactNode {
	const {
		state: { selected },
	} = useHistoryBrowser();
	const id = selected?.id.slice(0, SHORT_ID_LENGTH) ?? "";

	return <Text color="yellow">{`Delete run ${id} and its stored images? (y/N)`}</Text>;
}
