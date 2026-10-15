/** A short message shown as a toast, such as a copied ID or a failure. */
export interface StatusMessage {
	/** Tells this message from a newer one with the same text. */
	readonly id: number;
	readonly text: string;
	readonly tone: "error" | "success";
}

export const enum StatusActionType {
	StatusExpired = 11,
	Status = 12,
}

/** What a browser's reducer accepts to show or expire a toast. */
export type StatusAction =
	| { readonly id: number; readonly type: StatusActionType.StatusExpired }
	| { readonly status: StatusMessage; readonly type: StatusActionType.Status };

export interface StatusReporter {
	readonly reportError: (text: string) => void;
	readonly reportSuccess: (text: string) => void;
}

// Long enough to read a copied ID, short enough not to linger.
const TOAST_MILLISECONDS = 3500;

let nextId = 0;

/**
 * Applies a status action to the current message.
 *
 * @param current - The message on screen, if any.
 * @param action - A new message, or one whose time is up.
 * @returns The message to show; an expired one stays only if a newer one
 *   replaced it.
 */
export function reduceStatus(current: StatusMessage | undefined, action: StatusAction): StatusMessage | undefined {
	if (action.type === StatusActionType.Status) return action.status;

	return current?.id === action.id ? undefined : current;
}

/**
 * Builds the functions that show a toast and take it down again after a few
 * seconds. The timer is started by the action, not an effect, and never
 * keeps the process alive.
 *
 * @param dispatch - Sends status actions to the browser's reducer.
 * @returns Functions that report a success or an error.
 */
export function createStatusReporter(dispatch: (action: StatusAction) => void): StatusReporter {
	function report(text: string, tone: StatusMessage["tone"]): void {
		nextId += 1;
		const id = nextId;
		dispatch({ status: { id, text, tone }, type: StatusActionType.Status });
		setTimeout(() => {
			dispatch({ id, type: StatusActionType.StatusExpired });
		}, TOAST_MILLISECONDS).unref();
	}

	return {
		reportError(text): void {
			report(text, "error");
		},
		reportSuccess(text): void {
			report(text, "success");
		},
	};
}
