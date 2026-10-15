import { useSession } from "$interactive/session/session-context";
import { SessionListDialog } from "$interactive/session/session-list-dialog";

import { GenerateConfirmDialog } from "./generate-confirm-dialog";
import { GenerateDialog } from "./generate-screen-state";
import { ModelPickerDialog } from "./model-picker-dialog";

import type { ImageModelListItem } from "@openrouter/sdk/models";
import type { ReactNode } from "react";

import type { SessionSummary } from "$history/session-list";
import type { ModelCatalog } from "$interactive/models/model-browser-state";

export interface GenerateDialogsProperties {
	catalog: ModelCatalog;
	columns: number;
	/** The model the prompt box uses now. */
	currentModelId?: string | undefined;
	/** The dialog the screen opened, if any. */
	dialog?: GenerateDialog | undefined;
	/** Whether the next prompt edits an image, so only models that edit fit. */
	isEditing: boolean;
	now: Date;
	/** Takes a model picked in the picker. */
	onChooseModel: (model: ImageModelListItem) => void;
	/** Closes the screen's dialog. */
	onClose: () => void;
	/** Models used lately, most recent first. */
	recentIds: ReadonlyArray<string>;
	rows: number;
	/** Past sessions, the one used last first. */
	sessions: ReadonlyArray<SessionSummary>;
}

/**
 * The dialogs over the generate screen: the model picker or the session
 * list when the screen opens one, and the confirmation whenever the session
 * on screen has a priced request waiting.
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
	recentIds,
	rows,
	sessions,
}: Readonly<GenerateDialogsProperties>): ReactNode {
	const { actions, state } = useSession();
	const { pending } = state;

	function handleCancel(): void {
		actions.dismiss();
	}

	function handleConfirm(): void {
		actions.confirm();
	}

	return (
		<>
			{dialog === GenerateDialog.Model ? (
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
			{dialog === GenerateDialog.Sessions ? (
				<SessionListDialog columns={columns} now={now} rows={rows} sessions={sessions} onClose={onClose} />
			) : null}
			{pending === undefined ? null : (
				<GenerateConfirmDialog
					columns={columns}
					pending={pending}
					rows={rows}
					onCancel={handleCancel}
					onConfirm={handleConfirm}
				/>
			)}
		</>
	);
}
