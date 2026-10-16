import nodePath from "node:path";
import { Text } from "ink";

import { getDeleteChoices, getDeletion } from "$history/delete-run";
import { previewPrompt } from "$history/format-history";
import { ChoiceDialog } from "$interactive/components/choice-dialog";
import { theme } from "$interactive/components/theme";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";

// A few lines of the prompt at most; it wraps rather than being cut.
const MAX_PROMPT_LENGTH = 240;

function getSavedPaths(entry: HistoryEntry | undefined): Array<string> {
	return entry?.images.flatMap(({ output }) => (output === "-" ? [] : [output])) ?? [];
}

/**
 * Asks whether to delete the selected run, naming it by its prompt and
 * listing the images it saved. Yes deletes it from darkroom and keeps the
 * images; the second answer deletes them too; No, Esc, or a click outside
 * keeps everything.
 *
 * @returns The question as a dialog.
 */
export function HistoryDeleteDialog(): ReactNode {
	const {
		actions: { answerDelete },
		meta: { layout },
		state: { selected },
	} = useHistoryBrowser();
	const paths = getSavedPaths(selected);
	const count = paths.length;
	const choices = getDeleteChoices(count);

	function handleChoose(index: number): void {
		answerDelete(getDeletion(count, index));
	}

	return (
		<ChoiceDialog
			choices={choices}
			columns={layout.columns}
			rows={layout.rows}
			title="Delete this run?"
			width={72}
			onChoose={handleChoose}
		>
			<Text>
				{selected === undefined ? "This run" : `“${previewPrompt(selected.prompt, MAX_PROMPT_LENGTH)}”`}
			</Text>
			{paths.map((path) => (
				<Text key={path} color={theme.muted}>{`  ${nodePath.basename(path)}`}</Text>
			))}
		</ChoiceDialog>
	);
}
