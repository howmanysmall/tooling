import { useStdout } from "ink";

import { openFilesAsync } from "$history/open-files";
import { CommandPalette } from "$interactive/palette/command-palette";
import { useSession } from "$interactive/session/session-context";
import { SessionListDialog } from "$interactive/session/session-list-dialog";
import { copyImageAsync } from "$utilities/copy-image";

import { GenerateDialog } from "./generate-screen-state";
import { ModelPickerDialog } from "./model-picker-dialog";
import { SessionConfirm } from "./session-confirm";
import { getTranscriptDialog } from "./transcript-commands";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { ModelCatalog } from "$interactive/models/model-browser-state";

import type { OpenDialog } from "./generate-screen-state";
import type { TranscriptEnvironment } from "./transcript-commands";

export interface GenerateDialogsProperties {
	catalog: ModelCatalog;
	columns: number;
	/** The model the prompt box uses now. */
	currentModelId?: string | undefined;
	/** The dialog the screen opened, if any. */
	dialog?: OpenDialog | undefined;
	/** Whether the next prompt edits an image, so only models that edit fit. */
	isEditing: boolean;
	now: Date;
	/** Takes a model picked in the picker. */
	onChooseModel: (model: ImageModelListItem) => void;
	/** Closes the screen's dialog. */
	onClose: () => void;
	/** Puts text in the prompt box, as rewinding does. */
	onFillPrompt: (text: string) => void;
	/** Shows a failure as a toast. */
	onReportError: (text: string) => void;
	/** Shows a success as a toast. */
	onReportSuccess: (text: string) => void;
	/** Models used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
	rows: number;
	/** Past sessions, the one used last first. */
	sessions: ReadonlyArray<SessionSummary>;
}

/**
 * The dialogs over the generate screen: the model picker, the session
 * list, or the actions for a prompt or image you clicked when the screen
 * opens one, and the confirmation whenever the session on screen has a
 * priced request waiting.
 *
 * @param properties - What each dialog needs.
 * @param properties.catalog - The models and what they cost.
 * @param properties.columns - The screen's width.
 * @param properties.currentModelId - The model in use now.
 * @param properties.dialog - The dialog the screen opened.
 * @param properties.isEditing - Whether the next prompt edits an image.
 * @param properties.now - When the app opened.
 * @param properties.onChooseModel - Takes a picked model.
 * @param properties.onClose - Closes the screen's dialog.
 * @param properties.onFillPrompt - Puts text in the prompt box.
 * @param properties.onReportError - Shows a failure.
 * @param properties.onReportSuccess - Shows a success.
 * @param properties.recentIds - Models used lately.
 * @param properties.rows - The screen's height.
 * @param properties.sessions - Past sessions.
 * @returns The open dialogs, if any.
 */
export function GenerateDialogs({
	catalog,
	columns,
	currentModelId,
	dialog,
	isEditing,
	now,
	onChooseModel,
	onClose,
	onFillPrompt,
	onReportError,
	onReportSuccess,
	recentIds,
	rows,
	sessions,
}: Readonly<GenerateDialogsProperties>): ReactNode {
	const session = useSession();
	const { write } = useStdout();
	const transcript: TranscriptEnvironment = {
		copyImageAsync,
		fillPrompt: onFillPrompt,
		openImagesAsync: openFilesAsync,
		reportError: onReportError,
		reportSuccess: onReportSuccess,
		session: session.actions,
		write,
	};
	const actions = getTranscriptDialog(dialog, transcript);

	return (
		<>
			{actions === undefined ? null : (
				<CommandPalette
					columns={columns}
					commands={actions.commands}
					rows={rows}
					title={actions.title}
					onClose={onClose}
				/>
			)}
			{dialog?.kind === GenerateDialog.Model ? (
				<ModelPickerDialog
					catalog={catalog}
					columns={columns}
					currentId={currentModelId}
					isEditing={isEditing}
					recentIds={recentIds}
					rows={rows}
					onClose={onClose}
					onPick={onChooseModel}
				/>
			) : null}
			{dialog?.kind === GenerateDialog.Sessions ? (
				<SessionListDialog columns={columns} now={now} rows={rows} sessions={sessions} onClose={onClose} />
			) : null}
			<SessionConfirm columns={columns} rows={rows} />
		</>
	);
}
