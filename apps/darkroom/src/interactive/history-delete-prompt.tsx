import { Text } from "ink";

import { previewPrompt } from "$history/format-history";

import { useHistoryBrowser } from "./history-browser-context";
import { theme } from "./theme";

import type { ReactNode } from "react";

/**
 * The footer while asking whether to delete the selected run.
 *
 * @returns The question, naming the run by its prompt.
 */
export function HistoryDeletePrompt(): ReactNode {
	const {
		state: { selected },
	} = useHistoryBrowser();
	const name = selected === undefined ? "this run" : `“${previewPrompt(selected.prompt, 48)}”`;

	return (
		<Text wrap="truncate-end">
			<Text bold={true} color={theme.warning}>
				{"Delete "}
			</Text>
			<Text>{`${name} and its stored images?`}</Text>
			<Text color={theme.muted}>{"   y deletes · any other key keeps it"}</Text>
		</Text>
	);
}
