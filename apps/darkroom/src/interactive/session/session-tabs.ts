import { createSession, reduceSession, TurnPhase } from "./session-state";

import type { SessionAction, SessionState } from "./session-state";

/** The sessions open as tabs on the generate screen. */
export interface SessionTabs {
	/** The session on screen. */
	readonly activeId: string;
	/** Open sessions, in tab order. */
	readonly sessions: ReadonlyArray<SessionState>;
	/** Sessions that finished something while another tab was showing. */
	readonly unread: ReadonlySet<string>;
}

export type SessionTabsAction =
	| { readonly action: SessionAction; readonly session: string; readonly type: "in-session" }
	| { readonly delta: number; readonly type: "cycle" }
	| { readonly id: string; readonly replacement: SessionState; readonly type: "close" }
	| { readonly id: string; readonly session: SessionState; readonly type: "replace" }
	| { readonly id: string; readonly type: "select" }
	| { readonly session: SessionState; readonly type: "open" };

const NO_UNREAD: ReadonlySet<string> = new Set();
const SETTLING: ReadonlySet<SessionAction["type"]> = new Set<SessionAction["type"]>(["turn-done", "turn-failed"]);

/**
 * Opens the app's tabs.
 *
 * @param sessions - The open sessions, in tab order; never empty.
 * @param activeId - The one to show.
 * @returns The tabs, with nothing unread.
 */
export function createSessionTabs(sessions: ReadonlyArray<SessionState>, activeId: string): SessionTabs {
	return { activeId, sessions, unread: NO_UNREAD };
}

/**
 * Finds the session on screen.
 *
 * @param tabs - Every open session, with the one on screen.
 * @returns The session whose turns the screen shows.
 */
export function getActiveSession(tabs: SessionTabs): SessionState {
	return tabs.sessions.find((session) => session.id === tabs.activeId) ?? createSession(tabs.activeId);
}

function withoutUnread(unread: ReadonlySet<string>, id: string): ReadonlySet<string> {
	if (!unread.has(id)) return unread;
	const next = new Set(unread);
	next.delete(id);
	return next;
}

function select(tabs: SessionTabs, id: string): SessionTabs {
	return { ...tabs, activeId: id, unread: withoutUnread(tabs.unread, id) };
}

function applyInSession(tabs: SessionTabs, id: string, action: SessionAction): SessionTabs {
	// A request whose tab was closed still finishes; only its tab is gone.
	if (tabs.sessions.every((session) => session.id !== id)) return tabs;

	const sessions = tabs.sessions.map((session) => (session.id === id ? reduceSession(session, action) : session));
	const isUnread = id !== tabs.activeId && SETTLING.has(action.type);
	return { ...tabs, sessions, unread: isUnread ? new Set([...tabs.unread, id]) : tabs.unread };
}

function isEmpty(session: SessionState): boolean {
	return session.turns.length === 0;
}

/**
 * Shows a session, opening a tab for it unless one is open. An empty new
 * session reuses an empty tab, so there is only ever one.
 *
 * @param tabs - The open sessions.
 * @param session - The session to show.
 * @returns The tabs with it on screen.
 */
function open(tabs: SessionTabs, session: SessionState): SessionTabs {
	const existing = tabs.sessions.find(
		(candidate) => candidate.id === session.id || (isEmpty(session) && isEmpty(candidate)),
	);

	if (existing !== undefined) return select(tabs, existing.id);
	return select({ ...tabs, sessions: [...tabs.sessions, session] }, session.id);
}

/**
 * Closes a tab. The session stays in the history, to reopen from the
 * session list. The tab to its left shows next, or a new session when it
 * was the last.
 *
 * @param tabs - The open sessions.
 * @param id - The session to close.
 * @param replacement - A new session, for when no tab is left.
 * @returns The remaining tabs.
 */
function close(tabs: SessionTabs, id: string, replacement: SessionState): SessionTabs {
	const index = tabs.sessions.findIndex((session) => session.id === id);
	if (index === -1) return tabs;

	const sessions = tabs.sessions.toSpliced(index, 1);
	const unread = withoutUnread(tabs.unread, id);
	const neighbor = sessions[Math.max(0, index - 1)];
	if (neighbor === undefined) {
		return { activeId: replacement.id, sessions: [replacement], unread };
	}
	if (id !== tabs.activeId) {
		return { ...tabs, sessions, unread };
	}
	return select({ ...tabs, sessions, unread }, neighbor.id);
}

/**
 * Puts another session in a tab's place and shows it, as rewinding does.
 * The session it replaces stays in the history.
 *
 * @param tabs - The open sessions.
 * @param id - The session to replace.
 * @param session - The session to show in its place.
 * @returns The tabs with the new session on screen.
 */
function replace(tabs: SessionTabs, id: string, session: SessionState): SessionTabs {
	const sessions = tabs.sessions.map((tab) => (tab.id === id ? session : tab));
	return select({ ...tabs, sessions }, session.id);
}

function cycle(tabs: SessionTabs, delta: number): SessionTabs {
	const { length } = tabs.sessions;
	const index = tabs.sessions.findIndex((session) => session.id === tabs.activeId);
	const next = tabs.sessions[(((index + delta) % length) + length) % length];
	return next === undefined ? tabs : select(tabs, next.id);
}

/**
 * Applies one action to the open sessions: a turn's progress lands on the
 * session that sent it, wherever it is, and finishing marks a tab that
 * isn't showing as unread until it is shown.
 *
 * @param tabs - Every open session, with the one on screen.
 * @param action - What happened.
 * @returns The next tabs.
 */
export function reduceSessionTabs(tabs: SessionTabs, action: SessionTabsAction): SessionTabs {
	switch (action.type) {
		case "close":
			return close(tabs, action.id, action.replacement);
		case "cycle":
			return cycle(tabs, action.delta);
		case "in-session":
			return applyInSession(tabs, action.session, action.action);
		case "open":
			return open(tabs, action.session);
		case "replace":
			return replace(tabs, action.id, action.session);
		default:
			return select(tabs, action.id);
	}
}

/**
 * Says how a tab's session stands, for the mark beside its title.
 *
 * @param session - The session behind the tab, with its turns.
 * @param isUnread - Whether it finished something while hidden.
 * @returns Whether it is busy, unread, failed last, or idle.
 */
export function getTabStatus(session: SessionState, isUnread: boolean): TabStatus {
	if (session.turns.some((turn) => turn.phase === TurnPhase.Running || turn.phase === TurnPhase.Preparing)) {
		return TabStatus.Busy;
	}

	if (session.pending !== undefined) return TabStatus.Waiting;
	if (!isUnread) return TabStatus.Idle;
	return session.turns.at(-1)?.phase === TurnPhase.Failed ? TabStatus.Failed : TabStatus.Unread;
}

export const enum TabStatus {
	Busy = "busy",
	Failed = "failed",
	Idle = "idle",
	Unread = "unread",
	/** A request waits for you to confirm its cost. */
	Waiting = "waiting",
}
