import nodePath from "node:path";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { Text } from "ink";

import { getDeleteChoices, getDeletion, RunDeletion } from "$history/delete-run";
import { previewPrompt } from "$history/format-history";
import { ChoiceDialog } from "$interactive/components/choice-dialog";
import { theme } from "$interactive/components/theme";
import { useSession } from "$interactive/session/session-context";

import type { ReactNode } from "react";

import type { SessionTurn } from "$interactive/session/session-state";

export interface DeleteTurnDialogProperties {
	columns: number;
	/** Closes the dialog, whatever the answer. */
	onClose: () => void;
	/** Says what was deleted, as a toast. */
	onReportSuccess: (text: string) => void;
	rows: number;
	turn: SessionTurn;
}

// A few lines of the prompt at most; it wraps rather than being cut.
const MAX_PROMPT_LENGTH = 240;

function getSavedPaths(turn: SessionTurn): Array<string> {
	return turn.result?.images.flatMap(({ path }) => (path === undefined ? [] : [path])) ?? [];
}

function describeDeletion(deletion: RunDeletion, count: number): string {
	if (deletion === RunDeletion.Files) return `Deleted ${count} ${toPlural(count, "image")}`;
	return count === 0 ? "Deleted the turn" : "Deleted from darkroom; your files stay";
}

/**
 * Asks before deleting a turn, naming it by its prompt and listing the
 * images it saved. Yes takes it out of the session and the history; the
 * second answer deletes the saved images too; No, Esc, or a click outside
 * keeps everything.
 *
 * @param properties - The turn and what to do once answered.
 * @param properties.columns - The screen's width.
 * @param properties.onClose - Closes the dialog.
 * @param properties.onReportSuccess - Shows what was deleted.
 * @param properties.rows - The screen's height.
 * @param properties.turn - The turn to delete.
 * @returns The question as a dialog.
 */
export function DeleteTurnDialog({
	columns,
	onClose,
	onReportSuccess,
	rows,
	turn,
}: Readonly<DeleteTurnDialogProperties>): ReactNode {
	const { actions } = useSession();
	const paths = getSavedPaths(turn);
	const count = paths.length;
	const choices = getDeleteChoices(count);

	function handleChoose(index: number): void {
		onClose();
		const deletion = getDeletion(count, index);
		if (deletion === undefined) return;
		actions.remove(turn.id, deletion);
		onReportSuccess(describeDeletion(deletion, count));
	}

	return (
		<ChoiceDialog
			choices={choices}
			columns={columns}
			rows={rows}
			title="Delete this?"
			width={72}
			onChoose={handleChoose}
		>
			<Text>{`“${previewPrompt(turn.prompt, MAX_PROMPT_LENGTH)}”`}</Text>
			{paths.map((path) => (
				<Text key={path} color={theme.muted}>{`  ${nodePath.basename(path)}`}</Text>
			))}
		</ChoiceDialog>
	);
}
