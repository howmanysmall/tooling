import { Text, useInput } from "ink";

import { Dialog } from "$interactive/components/dialog";
import { theme } from "$interactive/components/theme";

import { summarizeRequest } from "./request-summary";

import type { ReactNode } from "react";

import type { KeyHint } from "$interactive/components/key-hints";
import type { PendingRequest } from "$interactive/session/session-state";

export interface GenerateConfirmDialogProperties {
	columns: number;
	/** Drops the request; nothing is sent. */
	onCancel: () => void;
	/** Sends the request. */
	onConfirm: () => void;
	pending: PendingRequest;
	rows: number;
}

const HINTS: ReadonlyArray<KeyHint> = [
	["⏎ y", "generate"],
	["esc n", "cancel"],
];

/**
 * Asks before spending: the request with its estimated cost and any
 * warnings. Enter or `y` sends it; Esc or `n` drops it.
 *
 * @param properties - The request and what to do with the answer.
 * @param properties.columns - The screen's width.
 * @param properties.onCancel - Drops the request.
 * @param properties.onConfirm - Sends the request.
 * @param properties.pending - The validated request and its estimate.
 * @param properties.rows - The screen's height.
 * @returns A dialog with the request's settings and cost.
 */
export function GenerateConfirmDialog({
	columns,
	onCancel,
	onConfirm,
	pending,
	rows,
}: Readonly<GenerateConfirmDialogProperties>): ReactNode {
	useInput(function onConfirmInput(input, key) {
		if (input === "y" || key.return) {
			onConfirm();
		} else if (input === "n" || key.escape) {
			onCancel();
		}
	});

	return (
		<Dialog columns={columns} hints={HINTS} rows={rows} title="Generate?" width={72} onDismiss={onCancel}>
			<Text>{summarizeRequest(pending.prepared, pending.cost)}</Text>
			{pending.prepared.warnings.map((warning) => (
				<Text key={warning} color={theme.warning}>{`! ${warning}`}</Text>
			))}
		</Dialog>
	);
}
