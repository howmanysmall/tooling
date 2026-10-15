import { use, useSyncExternalStore } from "react";

import { NoticeContext } from "$interactive/components/notice-store";

import { createSessionActions } from "./session-actions";
import { SessionContext } from "./session-context";
import { getActiveSession } from "./session-tabs";

import type { ReactNode } from "react";

import type { SessionEnvironment } from "./session-actions";
import type { SessionContextValue } from "./session-context";
import type { SessionServices } from "./session-services";
import type { SessionStore } from "./session-store";

export interface SessionProviderProperties {
	/** Called after each run is saved, so the history can catch up. */
	onRunSaved: () => void;
	services: SessionServices;
	/** The open sessions, which outlive the screens. */
	store: SessionStore;
	children: ReactNode;
}

function createSessionValue(environment: SessionEnvironment): SessionContextValue {
	const { tabs } = environment;
	return { actions: createSessionActions(environment), state: getActiveSession(tabs), tabs };
}

/**
 * Owns the open sessions for the whole app, so a re-run from the history
 * tab lands in the session on screen, and a request keeps reporting to its
 * own session after another tab is shown.
 *
 * @param properties - The store, the services, and the app.
 * @param properties.onRunSaved - Called after each run is saved.
 * @param properties.services - Validates, prices, and sends requests.
 * @param properties.store - The open sessions.
 * @param properties.children - The app.
 * @returns The app, with the session context around it.
 */
export function SessionProvider({
	onRunSaved,
	services,
	store,
	children,
}: Readonly<SessionProviderProperties>): ReactNode {
	const tabs = useSyncExternalStore(store.subscribe, store.getTabs);
	const notices = use(NoticeContext);

	function handleResumed(failure: string | undefined): void {
		if (failure !== undefined) notices?.reporter.reportError(`Couldn't resume the session: ${failure}`);
	}

	const value = createSessionValue({
		dispatch: store.dispatch,
		onResumed: handleResumed,
		onRunSaved,
		services,
		tabs,
	});

	return <SessionContext value={value}>{children}</SessionContext>;
}
