import { createUlid } from "$history/ulid";
import { runBrowserTask } from "$interactive/app/run-browser-task";
import { SessionActionType, SessionRequestType, SessionTabsActionType } from "$meta/action-types";

import { createSession, PromptMode, TurnPhase } from "./session-state";
import { getActiveSession } from "./session-tabs";

import type { GenerationResult } from "$generation/run-generation";
import type { RunDeletion } from "$history/delete-run";
import type { SessionSummary } from "$history/session-list";

import type { RestoredTurn } from "./restore-turns";
import type { SessionActions } from "./session-context";
import type { SessionRequest, SessionServices } from "./session-services";
import type { SessionAction, SessionState, SessionTurn } from "./session-state";
import type { SessionTabs, SessionTabsAction } from "./session-tabs";

export interface SessionEnvironment {
	readonly dispatch: (action: SessionTabsAction) => void;
	/** Called after each run is saved, so the history can catch up. */
	readonly onRunSaved: () => void;
	/** Shows an error from work done in the background, as a toast. */
	readonly reportError: (message: string) => void;
	readonly services: SessionServices;
	readonly tabs: SessionTabs;
}

let nextTurnId = 0;

/**
 * Says whether a turn is over, so it can be deleted. One still being
 * priced, confirmed, or generated stays: its request may be charged.
 *
 * @param turn - The turn to check.
 * @returns Whether it finished or failed.
 */
export function isSettled(turn: SessionTurn): boolean {
	return turn.phase === TurnPhase.Done || turn.phase === TurnPhase.Failed;
}

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
export function numberTurns(restored: ReadonlyArray<RestoredTurn>): ReadonlyArray<SessionTurn> {
	return Array.from(restored, (turn): SessionTurn => ({ ...turn, id: takeTurnId() }));
}

/**
 * Builds what the sessions can do. Every request is priced and confirmed
 * before it is sent, and lands on the session that sent it, even after
 * another tab is showing. Failures land on their turn instead of throwing.
 *
 * @param environment - The tabs, their store, and the services.
 * @param environment.dispatch - Sends actions to the tabs.
 * @param environment.reportError - Shows a background error.
 * @param environment.onRunSaved - Called after each run is saved.
 * @param environment.services - Validates, prices, and sends requests.
 * @param environment.tabs - The open sessions.
 * @returns The actions for the session context.
 */
export function createSessionActions({
	dispatch,
	onRunSaved,
	reportError,
	services,
	tabs,
}: SessionEnvironment): SessionActions {
	const active = getActiveSession(tabs);

	function dispatchTo(session: string, action: SessionAction): void {
		dispatch({ action, session, type: SessionTabsActionType.InSession });
	}

	function fail(session: string, id: number, error: string): void {
		dispatchTo(session, { id, at: Date.now(), error, type: SessionActionType.TurnFailed });
	}

	async function prepareAsync(session: string, id: number, request: SessionRequest): Promise<void> {
		const pending = await services.prepareAsync(request, session);
		dispatchTo(session, { id, pending, type: SessionActionType.Prepared });
	}

	/**
	 * Builds the session as it was before a turn: its finished turns up to
	 * there, under a new ULID, saved as a fork of the runs it keeps.
	 *
	 * @param turnId - The first turn to leave out.
	 * @returns The fork, or `undefined` when the turn isn't in the session.
	 */
	function createFork(turnId: number): SessionState | undefined {
		const index = active.turns.findIndex((turn) => turn.id === turnId);
		if (index === -1) return undefined;

		const kept = active.turns.slice(0, index).filter((turn) => turn.result !== undefined);
		const fork = createSession(createUlid(), kept);
		const runs = kept.flatMap((turn) => (turn.result === undefined ? [] : [turn.result.id]));
		if (runs.length > 0) {
			runBrowserTask(saveForkAsync(runs, fork.id), (failure) => {
				if (failure !== undefined) {
					reportError(`Couldn't save the fork: ${failure}`);
				}
			});
		}

		return fork;
	}

	async function saveForkAsync(runs: ReadonlyArray<string>, fork: string): Promise<void> {
		await services.forkAsync(runs, fork);
		onRunSaved();
	}

	async function deleteRunAsync(result: GenerationResult, deletion: RunDeletion): Promise<void> {
		await services.deleteRunAsync(result, deletion);
		onRunSaved();
	}

	async function resumeAsync({ id, runs }: SessionSummary): Promise<void> {
		const restored = await services.restoreAsync(runs);
		dispatch({ session: createSession(id, numberTurns(restored)), type: SessionTabsActionType.Open });
	}

	return {
		chooseBase(image): void {
			dispatchTo(active.id, { image, type: SessionActionType.ChooseBase });
		},
		close(id): void {
			dispatch({ id, replacement: createSession(createUlid()), type: SessionTabsActionType.Close });
		},
		confirm(): void {
			const { pending } = active;
			if (pending === undefined) return;

			const session = active.id;
			const { id } = pending;
			dispatchTo(session, { id, at: Date.now(), type: SessionActionType.TurnStarted });
			services.start(pending.prepared, {
				onDone(result): void {
					dispatchTo(session, { id, at: Date.now(), result, type: SessionActionType.TurnDone });
					onRunSaved();
				},
				onFailed(message): void {
					fail(session, id, message);
				},
				onProgress(progress): void {
					dispatchTo(session, { id, progress, type: SessionActionType.TurnProgress });
				},
				onWarning(warning): void {
					dispatchTo(session, { id, type: SessionActionType.TurnWarned, warning });
				},
			});
		},
		cycle(delta): void {
			dispatch({ delta, type: SessionTabsActionType.Cycle });
		},
		dismiss(): void {
			dispatchTo(active.id, { type: SessionActionType.Dismiss });
		},
		fork(turnId): void {
			const session = createFork(turnId);
			if (session !== undefined) {
				dispatch({ session, type: SessionTabsActionType.Open });
			}
		},
		newSession(): void {
			dispatch({ session: createSession(createUlid()), type: SessionTabsActionType.Open });
		},
		remove(turnId, deletion): void {
			const turn = active.turns.find(({ id }) => id === turnId);
			if (turn === undefined || !isSettled(turn)) return;

			dispatchTo(active.id, { id: turnId, type: SessionActionType.TurnRemoved });

			if (turn.result === undefined) return;
			runBrowserTask(deleteRunAsync(turn.result, deletion), (failure) => {
				if (failure !== undefined) {
					reportError(`Couldn't delete the run: ${failure}`);
				}
			});
		},
		resume(session): void {
			if (tabs.sessions.some((open) => open.id === session.id)) {
				dispatch({ id: session.id, type: SessionTabsActionType.Select });
			} else {
				runBrowserTask(resumeAsync(session), (failure) => {
					if (failure !== undefined) {
						reportError(`Couldn't resume the session: ${failure}`);
					}
				});
			}
		},
		rewind(turnId): void {
			const session = createFork(turnId);
			if (session !== undefined) {
				dispatch({ id: active.id, session, type: SessionTabsActionType.Replace });
			}
		},
		select(id): void {
			dispatch({ id, type: SessionTabsActionType.Select });
		},
		send(request): void {
			const session = active.id;
			const id = takeTurnId();
			const isNew = request.type === SessionRequestType.New;
			dispatchTo(session, {
				id,
				model: isNew ? request.model.id : request.entry.model,
				prompt: isNew ? request.prompt : request.entry.prompt,
				type: SessionActionType.TurnAdded,
			});
			runBrowserTask(prepareAsync(session, id, request), (failure) => {
				if (failure !== undefined) {
					fail(session, id, failure);
				}
			});
		},
		toggleMode(): void {
			const mode = active.mode === PromptMode.Edit ? PromptMode.New : PromptMode.Edit;
			dispatchTo(active.id, { mode, type: SessionActionType.SetMode });
		},
	};
}
