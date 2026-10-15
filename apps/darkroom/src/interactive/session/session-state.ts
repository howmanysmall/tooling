import type { StreamProgress } from "$generation/image-stream";
import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";

/** A validated request waiting for you to confirm what it will cost. */
export interface PendingRequest {
	/** The estimate, like `$0.04` or `≈ $0.04 (from past runs)`. */
	readonly cost: string;
	readonly prepared: PreparedGeneration;
}

export const enum TurnPhase {
	/** Validated and priced, waiting for you to confirm. */
	Confirming = "confirming",
	Done = "done",
	Failed = "failed",
	/** Being validated and priced. */
	Preparing = "preparing",
	Running = "running",
}

/** One request in the session: your prompt and what came back. */
export interface SessionTurn {
	readonly id: number;
	/** Why it failed. */
	readonly error?: string | undefined;
	/** When it settled, in milliseconds since the epoch. */
	readonly finishedAt?: number | undefined;
	/** The model's display name, or its ID until the request is validated. */
	readonly modelName: string;
	readonly phase: TurnPhase;
	readonly progress?: StreamProgress | undefined;
	readonly prompt: string;
	/** How many images were asked for, once known. */
	readonly requested: number;
	readonly result?: GenerationResult | undefined;
	/** When it was sent, in milliseconds since the epoch. */
	readonly startedAt?: number | undefined;
	/** Warnings from validating and saving, such as an ignored setting. */
	readonly warnings: ReadonlyArray<string>;
}

export interface SessionState {
	/** The request the confirmation asks about, by turn ID. */
	readonly pending?: (PendingRequest & { readonly id: number }) | undefined;
	/** Oldest first. */
	readonly turns: ReadonlyArray<SessionTurn>;
}

export type SessionAction =
	| { readonly at: number; readonly error: string; readonly id: number; readonly type: "turn-failed" }
	| { readonly at: number; readonly id: number; readonly result: GenerationResult; readonly type: "turn-done" }
	| { readonly at: number; readonly id: number; readonly type: "turn-started" }
	| { readonly id: number; readonly modelName: string; readonly prompt: string; readonly type: "turn-added" }
	| { readonly id: number; readonly pending: PendingRequest; readonly type: "prepared" }
	| { readonly id: number; readonly progress: StreamProgress; readonly type: "turn-progress" }
	| { readonly id: number; readonly type: "turn-warned"; readonly warning: string }
	| { readonly type: "dismiss" }
	| { readonly type: "new-session" };

export const INITIAL_SESSION: SessionState = { turns: [] };

const UNSETTLED: ReadonlySet<TurnPhase> = new Set([TurnPhase.Confirming, TurnPhase.Preparing, TurnPhase.Running]);

function updateTurn(state: SessionState, id: number, update: (turn: SessionTurn) => SessionTurn): SessionState {
	return { ...state, turns: state.turns.map((turn) => (turn.id === id ? update(turn) : turn)) };
}

function addTurn(state: SessionState, id: number, modelName: string, prompt: string): SessionState {
	const turn: SessionTurn = { id, modelName, phase: TurnPhase.Preparing, prompt, requested: 1, warnings: [] };
	return { ...state, turns: [...state.turns, turn] };
}

function confirmTurn(state: SessionState, id: number, pending: PendingRequest): SessionState {
	const { model, parameters, warnings } = pending.prepared;
	const next = updateTurn(state, id, (turn) => ({
		...turn,
		modelName: model.name,
		phase: TurnPhase.Confirming,
		requested: parameters.count,
		warnings,
	}));
	return { ...next, pending: { ...pending, id } };
}

function dismissPending(state: SessionState): SessionState {
	const id = state.pending?.id;
	return { turns: state.turns.filter((turn) => turn.id !== id) };
}

function settleTurn(state: SessionState, id: number, settled: Partial<SessionTurn>): SessionState {
	return updateTurn(state, id, (turn) => ({ ...turn, ...settled }));
}

/**
 * Applies one session action. A turn appears as soon as you send it, waits
 * for your confirmation once priced, and its progress, result, or failure
 * land on it by ID, so several can run at once.
 *
 * @param state - The turns and the request awaiting confirmation.
 * @param action - What happened.
 * @returns The next state.
 */
export function reduceSession(state: SessionState, action: SessionAction): SessionState {
	switch (action.type) {
		case "dismiss":
			return dismissPending(state);
		case "new-session":
			return { ...state, turns: state.turns.filter((turn) => UNSETTLED.has(turn.phase)) };
		case "prepared":
			return confirmTurn(state, action.id, action.pending);
		case "turn-added":
			return addTurn(state, action.id, action.modelName, action.prompt);
		case "turn-done": {
			return settleTurn(state, action.id, {
				finishedAt: action.at,
				phase: TurnPhase.Done,
				result: action.result,
			});
		}
		case "turn-failed": {
			return settleTurn(state, action.id, {
				error: action.error,
				finishedAt: action.at,
				phase: TurnPhase.Failed,
			});
		}
		case "turn-progress":
			return settleTurn(state, action.id, { progress: action.progress });
		case "turn-started":
			return { turns: settleTurn(state, action.id, { phase: TurnPhase.Running, startedAt: action.at }).turns };
		default:
			return updateTurn(state, action.id, (turn) => ({ ...turn, warnings: [...turn.warnings, action.warning] }));
	}
}
