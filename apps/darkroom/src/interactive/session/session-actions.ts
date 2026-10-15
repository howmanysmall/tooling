import { createUlid } from "$history/ulid";
import { runBrowserTask } from "$interactive/app/run-browser-task";

import { createSession, PromptMode } from "./session-state";
import { getActiveSession } from "./session-tabs";

import type { SessionSummary } from "$history/session-list";

import type { RestoredTurn } from "./restore-turns";
import type { SessionActions } from "./session-context";
import type { SessionRequest, SessionServices } from "./session-services";
import type { SessionAction, SessionTurn } from "./session-state";
import type { SessionTabs, SessionTabsAction } from "./session-tabs";

export interface SessionEnvironment {
	readonly dispatch: (action: SessionTabsAction) => void;
	/** Reports how resuming went: why it failed, or `undefined`. */
	readonly onResumed: (failure: string | undefined) => void;
	/** Called after each run is saved, so the history can catch up. */
	readonly onRunSaved: () => void;
	readonly services: SessionServices;
	readonly tabs: SessionTabs;
}

let nextTurnId = 0;

function takeTurnId(): number {
	nextTurnId += 1;
	return nextTurnId;
}

/**
 * Numbers turns rebuilt from the history, so they can sit beside new ones.
 *
 * @param restored - The turns, oldest first.
 * @returns The same turns, each with its own ID.
 */
export function numberTurns(restored: ReadonlyArray<RestoredTurn>): Array<SessionTurn> {
	return Array.from(restored, (turn): SessionTurn => ({ ...turn, id: takeTurnId() }));
}

/**
 * Builds what the sessions can do. Every request is priced and confirmed
 * before it is sent, and lands on the session that sent it, even after
 * another tab is showing. Failures land on their turn instead of throwing.
 *
 * @param environment - The tabs, their store, and the services.
 * @param environment.dispatch - Sends actions to the tabs.
 * @param environment.onResumed - Reports how resuming went.
 * @param environment.onRunSaved - Called after each run is saved.
 * @param environment.services - Validates, prices, and sends requests.
 * @param environment.tabs - The open sessions.
 * @returns The actions for the session context.
 */
export function createSessionActions({
	dispatch,
	onResumed,
	onRunSaved,
	services,
	tabs,
}: SessionEnvironment): SessionActions {
	const active = getActiveSession(tabs);

	function dispatchTo(session: string, action: SessionAction): void {
		dispatch({ action, session, type: "in-session" });
	}

	function fail(session: string, id: number, error: string): void {
		dispatchTo(session, { id, at: Date.now(), error, type: "turn-failed" });
	}

	async function prepareAsync(session: string, id: number, request: SessionRequest): Promise<void> {
		const pending = await services.prepareAsync(request, session);
		dispatchTo(session, { id, pending, type: "prepared" });
	}

	async function resumeAsync({ id, runs }: SessionSummary): Promise<void> {
		const restored = await services.restoreAsync(runs);
		dispatch({ session: createSession(id, numberTurns(restored)), type: "open" });
	}

	return {
		chooseBase(image): void {
			dispatchTo(active.id, { image, type: "choose-base" });
		},
		close(id): void {
			dispatch({ id, replacement: createSession(createUlid()), type: "close" });
		},
		confirm(): void {
			const { pending } = active;
			if (pending === undefined) return;

			const session = active.id;
			const { id } = pending;
			dispatchTo(session, { id, at: Date.now(), type: "turn-started" });
			services.start(pending.prepared, {
				onDone(result): void {
					dispatchTo(session, { id, at: Date.now(), result, type: "turn-done" });
					onRunSaved();
				},
				onFailed(message): void {
					fail(session, id, message);
				},
				onProgress(progress): void {
					dispatchTo(session, { id, progress, type: "turn-progress" });
				},
				onWarning(warning): void {
					dispatchTo(session, { id, type: "turn-warned", warning });
				},
			});
		},
		cycle(delta): void {
			dispatch({ delta, type: "cycle" });
		},
		dismiss(): void {
			dispatchTo(active.id, { type: "dismiss" });
		},
		newSession(): void {
			dispatch({ session: createSession(createUlid()), type: "open" });
		},
		resume(session): void {
			if (tabs.sessions.some((open) => open.id === session.id)) dispatch({ id: session.id, type: "select" });
			else runBrowserTask(resumeAsync(session), onResumed);
		},
		select(id): void {
			dispatch({ id, type: "select" });
		},
		send(request): void {
			const session = active.id;
			const id = takeTurnId();
			const isNew = request.type === "new";
			dispatchTo(session, {
				id,
				model: isNew ? request.model.id : request.entry.model,
				prompt: isNew ? request.prompt : request.entry.prompt,
				type: "turn-added",
			});
			runBrowserTask(prepareAsync(session, id, request), (failure) => {
				if (failure !== undefined) fail(session, id, failure);
			});
		},
		toggleMode(): void {
			const mode = active.mode === PromptMode.Edit ? PromptMode.New : PromptMode.Edit;
			dispatchTo(active.id, { mode, type: "set-mode" });
		},
	};
}
