import { SessionListDialog } from "$interactive/session/session-list-dialog";

import { GenerateDialog } from "./generate-screen-state";
import { ModelPickerDialog } from "./model-picker-dialog";
import { SessionConfirm } from "./session-confirm";
import { TranscriptDialogs } from "./transcript-dialogs";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { ModelCatalog } from "$interactive/models/model-browser-state";
import type { SessionTurn } from "$interactive/session/session-state";

import type { OpenDialog } from "./generate-screen-state";

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
	/** Asks whether to delete a turn and its images. */
	onAskDelete: (turn: SessionTurn) => void;
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
 * list, the actions for a prompt or image you clicked, or whether to delete
 * one, when the screen opens one, and the confirmation whenever the session
 * on screen has a priced request waiting.
 *
 * @param properties - What each dialog needs.
 * @param properties.catalog - The models and what they cost.
 * @param properties.columns - The screen's width.
 * @param properties.currentModelId - The model in use now.
 * @param properties.dialog - The dialog the screen opened.
 * @param properties.isEditing - Whether the next prompt edits an image.
 * @param properties.now - When the app opened.
 * @param properties.onAskDelete - Asks whether to delete a turn.
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
	onAskDelete,
	onChooseModel,
	onClose,
	onFillPrompt,
	onReportError,
	onReportSuccess,
	recentIds,
	rows,
	sessions,
}: Readonly<GenerateDialogsProperties>): ReactNode {
	return (
		<>
			<TranscriptDialogs
				columns={columns}
				dialog={dialog}
				rows={rows}
				onAskDelete={onAskDelete}
				onClose={onClose}
				onFillPrompt={onFillPrompt}
				onReportError={onReportError}
				onReportSuccess={onReportSuccess}
			/>
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
