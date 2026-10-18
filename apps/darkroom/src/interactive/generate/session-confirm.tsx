import { useSession } from "$interactive/session/session-context";

import { GenerateConfirmDialog } from "./generate-confirm-dialog";

import type { ReactNode } from "react";

export interface SessionConfirmProperties {
	columns: number;
	rows: number;
}

/**
 * Asks to confirm the request the session on screen has priced, if any.
 *
 * @param properties - The screen's size.
 * @param properties.columns - The screen's width.
 * @param properties.rows - The screen's height.
 * @returns The confirmation, or nothing while no request waits.
 */
export function SessionConfirm({ columns, rows }: Readonly<SessionConfirmProperties>): ReactNode {
	const { actions, state } = useSession();
	const { pending } = state;

	function handleCancel(): void {
		actions.dismiss();
	}

	function handleConfirm(): void {
		actions.confirm();
	}

	if (pending === undefined) return null;
	return (
		<GenerateConfirmDialog
			columns={columns}
			pending={pending}
			rows={rows}
			onCancel={handleCancel}
			onConfirm={handleConfirm}
		/>
	);
}
