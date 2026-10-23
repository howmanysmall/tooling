import { useStdout } from "ink";

import { openFilesAsync } from "$history/open-files";
import { CommandPalette } from "$interactive/palette/command-palette";
import { useSession } from "$interactive/session/session-context";
import { copyImageAsync } from "$utilities/copy-image";

import { DeleteTurnDialog } from "./delete-turn-dialog";
import { GenerateDialog } from "./generate-screen-state";
import { getTranscriptDialog } from "./transcript-commands";

import type { ReactNode } from "react";

import type { SessionTurn } from "$interactive/session/session-state";

import type { OpenDialog } from "./generate-screen-state";
import type { TranscriptEnvironment } from "./transcript-commands";

export interface TranscriptDialogsProperties {
	columns: number;
	/** The dialog the screen opened, if any. */
	dialog?: OpenDialog | undefined;
	/** Asks whether to delete a turn and its images. */
	onAskDelete: (turn: SessionTurn) => void;
	/** Closes the screen's dialog. */
	onClose: () => void;
	/** Puts text in the prompt box, as rewinding does. */
	onFillPrompt: (text: string) => void;
	/** Shows a failure as a toast. */
	onReportError: (text: string) => void;
	/** Shows a success as a toast. */
	onReportSuccess: (text: string) => void;
	rows: number;
}

/**
 * The dialogs for something clicked in the transcript: the actions for a
 * prompt or an image, and the question before deleting one.
 *
 * @param properties - The open dialog and what its actions reach.
 * @param properties.columns - The screen's width.
 * @param properties.dialog - The dialog the screen opened.
 * @param properties.onAskDelete - Asks whether to delete a turn.
 * @param properties.onClose - Closes the screen's dialog.
 * @param properties.onFillPrompt - Puts text in the prompt box.
 * @param properties.onReportError - Shows a failure.
 * @param properties.onReportSuccess - Shows a success.
 * @param properties.rows - The screen's height.
 * @returns The open dialog, if it is one of these.
 */
export function TranscriptDialogs({
	columns,
	dialog,
	onAskDelete,
	onClose,
	onFillPrompt,
	onReportError,
	onReportSuccess,
	rows,
}: Readonly<TranscriptDialogsProperties>): ReactNode {
	const session = useSession();
	const { write } = useStdout();
	const transcript: TranscriptEnvironment = {
		askDelete: onAskDelete,
		copyImageAsync,
		fillPrompt: onFillPrompt,
		openImagesAsync: openFilesAsync,
		reportError: onReportError,
		reportSuccess: onReportSuccess,
		session: session.actions,
		turns: session.state.turns,
		write,
	};
	const actions = getTranscriptDialog(dialog, transcript);

	if (dialog?.kind === GenerateDialog.Delete) {
		return (
			<DeleteTurnDialog
				columns={columns}
				rows={rows}
				turn={dialog.turn}
				onClose={onClose}
				onReportSuccess={onReportSuccess}
			/>
		);
	}

	if (actions === undefined) return null;

	return (
		<CommandPalette
			columns={columns}
			commands={actions.commands}
			rows={rows}
			title={actions.title}
			onClose={onClose}
		/>
	);
}
