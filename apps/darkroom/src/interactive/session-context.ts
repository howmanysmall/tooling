import { createContext, use } from "react";

import type { SessionRequest } from "./session-services";
import type { SessionState } from "./session-state";

export interface SessionActions {
	/** Sends the request awaiting confirmation. */
	readonly confirm: () => void;
	/** Drops the request awaiting confirmation; nothing is sent. */
	readonly dismiss: () => void;
	/** Clears the finished turns. */
	readonly newSession: () => void;
	/** Validates and prices a request, then asks to confirm it. */
	readonly send: (request: SessionRequest) => void;
}

export interface SessionContextValue {
	readonly actions: SessionActions;
	readonly state: SessionState;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
SessionContext.displayName = "SessionContext";

/**
 * Reads the generate session.
 *
 * @returns The session's turns and actions.
 * @throws {Error} Outside a `SessionProvider`.
 */
export function useSession(): SessionContextValue {
	const value = use(SessionContext);
	if (value === undefined) throw new Error("useSession needs a SessionProvider.");
	return value;
}
