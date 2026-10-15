import { runBrowserTask } from "./run-browser-task";

import type { Dispatch } from "react";

import type { SessionActions } from "./session-context";
import type { SessionRequest, SessionServices } from "./session-services";
import type { SessionAction, SessionState } from "./session-state";

export interface SessionEnvironment {
	readonly dispatch: Dispatch<SessionAction>;
	/** Called after each run is saved, so the history can catch up. */
	readonly onRunSaved: () => void;
	readonly services: SessionServices;
	readonly state: SessionState;
}

const DISMISS: SessionAction = { type: "dismiss" };
const NEW_SESSION: SessionAction = { type: "new-session" };

let nextTurnId = 0;

/**
 * Builds what the session can do. Every request is priced and confirmed
 * before it is sent, and failures land on their turn instead of throwing.
 *
 * @param environment - The reducer, the services, and the session.
 * @param environment.dispatch - Sends actions to the session reducer.
 * @param environment.onRunSaved - Called after each run is saved.
 * @param environment.services - Validates, prices, and sends requests.
 * @param environment.state - The current session.
 * @returns The actions for the session context.
 */
export function createSessionActions({ dispatch, onRunSaved, services, state }: SessionEnvironment): SessionActions {
	function fail(id: number, error: string): void {
		dispatch({ id, at: Date.now(), error, type: "turn-failed" });
	}

	async function prepareAsync(id: number, request: SessionRequest): Promise<void> {
		const pending = await services.prepareAsync(request);
		dispatch({ id, pending, type: "prepared" });
	}

	return {
		confirm(): void {
			const { pending } = state;
			if (pending === undefined) return;

			const { id } = pending;
			dispatch({ id, at: Date.now(), type: "turn-started" });
			services.start(pending.prepared, {
				onDone(result): void {
					dispatch({ id, at: Date.now(), result, type: "turn-done" });
					onRunSaved();
				},
				onFailed(message): void {
					fail(id, message);
				},
				onProgress(progress): void {
					dispatch({ id, progress, type: "turn-progress" });
				},
				onWarning(warning): void {
					dispatch({ id, type: "turn-warned", warning });
				},
			});
		},
		dismiss(): void {
			dispatch(DISMISS);
		},
		newSession(): void {
			dispatch(NEW_SESSION);
		},
		send(request): void {
			nextTurnId += 1;
			const id = nextTurnId;
			const isNew = request.type === "new";
			dispatch({
				id,
				modelName: isNew ? request.model.name : request.entry.model,
				prompt: isNew ? request.prompt : request.entry.prompt,
				type: "turn-added",
			});
			runBrowserTask(prepareAsync(id, request), (failure) => {
				if (failure !== undefined) fail(id, failure);
			});
		},
	};
}
