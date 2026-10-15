import { useReducer } from "react";

import { createSessionActions } from "./session-actions";
import { SessionContext } from "./session-context";
import { INITIAL_SESSION, reduceSession } from "./session-state";

import type { ReactNode } from "react";

import type { SessionEnvironment } from "./session-actions";
import type { SessionContextValue } from "./session-context";
import type { SessionServices } from "./session-services";

export interface SessionProviderProperties {
	/** Called after each run is saved, so the history can catch up. */
	onRunSaved: () => void;
	services: SessionServices;
	children: ReactNode;
}

function createSessionValue(environment: SessionEnvironment): SessionContextValue {
	return { actions: createSessionActions(environment), state: environment.state };
}

/**
 * Owns the generate session for the whole app, so a re-run from the
 * history tab lands in the same session as the prompt box's requests.
 *
 * @param properties - The services and the app.
 * @param properties.onRunSaved - Called after each run is saved.
 * @param properties.services - Validates, prices, sends, and stops requests.
 * @param properties.children - The app.
 * @returns The app, with the session context around it.
 */
export function SessionProvider({ onRunSaved, services, children }: Readonly<SessionProviderProperties>): ReactNode {
	const [state, dispatch] = useReducer(reduceSession, INITIAL_SESSION);
	const value = createSessionValue({ dispatch, onRunSaved, services, state });

	return <SessionContext value={value}>{children}</SessionContext>;
}
