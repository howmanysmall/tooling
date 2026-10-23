import { TurnPhase } from "./session-state";
import { reduceSessionTabs } from "./session-tabs";

import type { OpenTabs } from "./open-tabs-file";
import type { SessionTabs, SessionTabsAction } from "./session-tabs";

/** The open sessions, outside React, so the tabs outlive any screen. */
export interface SessionStore {
	readonly dispatch: (action: SessionTabsAction) => void;
	/** Waits for the open tabs to be saved. */
	readonly flushAsync: () => Promise<void>;
	readonly getTabs: () => SessionTabs;
	readonly subscribe: (listener: () => void) => () => void;
}

/**
 * Lists the tabs worth opening again: sessions with a saved run, since
 * the rest can't be rebuilt from the history.
 *
 * @param tabs - The open sessions.
 * @param tabs.activeId - The session on screen.
 * @param tabs.sessions - Every open session, in tab order.
 * @returns Their IDs in tab order, and the one on screen.
 */
export function toOpenTabs({ activeId, sessions }: SessionTabs): OpenTabs {
	const open: Array<string> = [];
	for (const session of sessions) {
		if (session.turns.some((turn) => turn.phase === TurnPhase.Done)) open.push(session.id);
	}

	return open.includes(activeId) ? { active: activeId, open } : { open };
}

/**
 * Holds the open sessions and saves which are open whenever that changes,
 * one write at a time.
 *
 * @param initial - The tabs to open with.
 * @param saveAsync - Saves the open tabs.
 * @returns The store, for the session provider.
 */
export function createSessionStore(initial: SessionTabs, saveAsync: (tabs: OpenTabs) => Promise<void>): SessionStore {
	const listeners = new Set<() => void>();
	let tabs = initial;
	let saved = JSON.stringify(toOpenTabs(initial));
	let saving = Promise.resolve();

	function save(): void {
		const open = toOpenTabs(tabs);
		const serialized = JSON.stringify(open);
		if (serialized === saved) return;

		saved = serialized;
		// Losing the open tabs costs a click in the session list, never a run.
		saving = saving.then(async () => saveAsync(open)).catch(() => undefined);
	}

	return {
		dispatch(action): void {
			tabs = reduceSessionTabs(tabs, action);
			save();

			for (const listener of listeners) listener();
		},
		flushAsync: async () => saving,
		getTabs: () => tabs,
		subscribe(listener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
