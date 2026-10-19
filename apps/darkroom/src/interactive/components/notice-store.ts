import { createContext, use, useSyncExternalStore } from "react";

import { getNothing, subscribeToNothing } from "./empty-store";
import { createStatusReporter, reduceStatus } from "./status-message";

import type { StatusMessage, StatusReporter } from "./status-message";

/** Toasts from outside a screen, like text copied with the mouse. */
export interface NoticeStore {
	readonly getNotice: () => StatusMessage | undefined;
	readonly reporter: StatusReporter;
	readonly subscribe: (listener: () => void) => () => void;
}

/**
 * Holds the latest app-wide toast, which expires like a screen's own.
 *
 * @returns The store, for `NoticeContext`.
 */
export function createNoticeStore(): NoticeStore {
	const listeners = new Set<() => void>();
	let notice: StatusMessage | undefined;

	const reporter = createStatusReporter((action) => {
		notice = reduceStatus(notice, action);
		for (const listener of listeners) listener();
	});

	return {
		getNotice: () => notice,
		reporter,
		subscribe(listener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

export const NoticeContext = createContext<NoticeStore | undefined>(undefined);
NoticeContext.displayName = "NoticeContext";

/**
 * Reads the app-wide toast, if the app has a notice store.
 *
 * @returns The latest notice, until it expires.
 */
export function useNotice(): StatusMessage | undefined {
	const store = use(NoticeContext);
	return useSyncExternalStore(store?.subscribe ?? subscribeToNothing, store?.getNotice ?? getNothing);
}

/**
 * Picks the toast to show between a screen's status and an app-wide notice.
 *
 * @param status - The screen's last outcome.
 * @param notice - The app-wide notice.
 * @returns The newer one; both count from the same sequence.
 */
export function pickNewerMessage(status?: StatusMessage, notice?: StatusMessage): StatusMessage | undefined {
	if (status === undefined) return notice;
	if (notice === undefined) return status;
	return notice.id > status.id ? notice : status;
}
