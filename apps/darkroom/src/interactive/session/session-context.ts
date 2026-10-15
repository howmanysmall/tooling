import { createContext, use } from "react";

import type { SessionSummary } from "$history/session-list";

import type { SessionRequest } from "./session-services";
import type { BaseImage, SessionState } from "./session-state";
import type { SessionTabs } from "./session-tabs";

export interface SessionActions {
	/** Makes an image the one the next prompt edits, in edit mode. */
	readonly chooseBase: (image: BaseImage) => void;
	/** Closes a session's tab; the session stays in the history. */
	readonly close: (id: string) => void;
	/** Sends the request awaiting confirmation in the session on screen. */
	readonly confirm: () => void;
	/** Shows the next tab, or the previous one with a negative `delta`. */
	readonly cycle: (delta: number) => void;
	/** Drops the request awaiting confirmation; nothing is sent. */
	readonly dismiss: () => void;
	/** Opens a new session, or shows the empty one already open. */
	readonly newSession: () => void;
	/** Shows a past session, opening its tab with its turns. */
	readonly resume: (session: SessionSummary) => void;
	/** Shows an open session. */
	readonly select: (id: string) => void;
	/** Validates and prices a request, then asks to confirm it. */
	readonly send: (request: SessionRequest) => void;
	/** Switches between editing the base image and starting fresh. */
	readonly toggleMode: () => void;
}

export interface SessionContextValue {
	readonly actions: SessionActions;
	/** The session on screen. */
	readonly state: SessionState;
	readonly tabs: SessionTabs;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
SessionContext.displayName = "SessionContext";

/**
 * Reads the open sessions and the one on screen.
 *
 * @returns The sessions and their actions.
 * @throws {Error} Outside a `SessionProvider`.
 */
export function useSession(): SessionContextValue {
	const value = use(SessionContext);
	if (value === undefined) {
		throw new Error("useSession needs a SessionProvider.");
	}
	return value;
}
