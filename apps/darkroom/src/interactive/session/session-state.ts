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
	/** The model's ID; screens show its name. */
	readonly model: string;
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

/** Whether a new prompt changes an image above or starts from nothing. */
export const enum PromptMode {
	Edit = "edit",
	New = "new",
}

/** A saved image a prompt in edit mode builds on. */
export interface BaseImage {
	readonly mediaType: string;
	readonly path: string;
}

export interface SessionState {
	/** The ULID its runs are saved under, so it can be resumed. */
	readonly id: string;
	/**
	 * The image a prompt edits: the newest result, or the image you
	 * clicked. `undefined` until something is made.
	 */
	readonly base?: BaseImage | undefined;
	readonly mode: PromptMode;
	/** The request the confirmation asks about, by turn ID. */
	readonly pending?: (PendingRequest & { readonly id: number }) | undefined;
	/** Oldest first. */
	readonly turns: ReadonlyArray<SessionTurn>;
}

export type SessionAction =
	| { readonly at: number; readonly error: string; readonly id: number; readonly type: "turn-failed" }
	| { readonly at: number; readonly id: number; readonly result: GenerationResult; readonly type: "turn-done" }
	| { readonly at: number; readonly id: number; readonly type: "turn-started" }
	| { readonly id: number; readonly model: string; readonly prompt: string; readonly type: "turn-added" }
	| { readonly id: number; readonly pending: PendingRequest; readonly type: "prepared" }
	| { readonly id: number; readonly progress: StreamProgress; readonly type: "turn-progress" }
	| { readonly id: number; readonly type: "turn-removed" }
	| { readonly id: number; readonly type: "turn-warned"; readonly warning: string }
	| { readonly image: BaseImage; readonly type: "choose-base" }
	| { readonly mode: PromptMode; readonly type: "set-mode" }
	| { readonly type: "dismiss" };

function getFirstImage(result: GenerationResult | undefined): BaseImage | undefined {
	const image = result?.images.find((saved) => saved.path !== undefined);
	return image?.path === undefined ? undefined : { mediaType: image.mediaType, path: image.path };
}

/**
 * Starts a session in edit mode, building on the newest image of the
 * turns it resumes, if any.
 *
 * @param id - The ULID its runs will be saved under.
 * @param turns - Turns resumed from the history, oldest first.
 * @returns A session with no request awaiting confirmation.
 */
export function createSession(id: string, turns: ReadonlyArray<SessionTurn> = []): SessionState {
	return { id, base: findNewestImage(turns), mode: PromptMode.Edit, turns };
}

function findNewestImage(turns: ReadonlyArray<SessionTurn>): BaseImage | undefined {
	for (const turn of turns.toReversed()) {
		const image = getFirstImage(turn.result);
		if (image !== undefined) return image;
	}
	return undefined;
}

/**
 * Says what the next prompt builds on: the base image in edit mode, or
 * nothing in new mode or before any image is made.
 *
 * @param state - The session on screen.
 * @returns The image to edit, if any.
 */
export function getEditBase(state: SessionState): BaseImage | undefined {
	return state.mode === PromptMode.Edit ? state.base : undefined;
}

/**
 * Names a session after its first prompt, as its tab and the session list
 * show it.
 *
 * @param state - The session to name.
 * @returns The first prompt, or `New session` before there is one.
 */
export function getSessionTitle(state: SessionState): string {
	return state.turns[0]?.prompt ?? "New session";
}

function updateTurn(state: SessionState, id: number, update: (turn: SessionTurn) => SessionTurn): SessionState {
	return { ...state, turns: state.turns.map((turn) => (turn.id === id ? update(turn) : turn)) };
}

function addTurn(state: SessionState, id: number, model: string, prompt: string): SessionState {
	const turn: SessionTurn = { id, model, phase: TurnPhase.Preparing, prompt, requested: 1, warnings: [] };
	return { ...state, turns: [...state.turns, turn] };
}

function confirmTurn(state: SessionState, id: number, pending: PendingRequest): SessionState {
	const { model, parameters, warnings } = pending.prepared;
	const next = updateTurn(state, id, (turn) => ({
		...turn,
		model: model.id,
		phase: TurnPhase.Confirming,
		requested: parameters.count,
		warnings,
	}));
	return { ...next, pending: { ...pending, id } };
}

function dismissPending(state: SessionState): SessionState {
	const id = state.pending?.id;
	return { ...state, pending: undefined, turns: state.turns.filter((turn) => turn.id !== id) };
}

function isFromTurn(image: BaseImage | undefined, turn: SessionTurn | undefined): boolean {
	return image !== undefined && turn?.result?.images.some((saved) => saved.path === image.path) === true;
}

function removeTurn(state: SessionState, id: number): SessionState {
	const turns = state.turns.filter((turn) => turn.id !== id);
	const removed = state.turns.find((turn) => turn.id === id);
	// An image that's gone can't be edited; the newest one left takes over.
	const base = isFromTurn(state.base, removed) ? findNewestImage(turns) : state.base;
	return { ...state, base, pending: state.pending?.id === id ? undefined : state.pending, turns };
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
		case "choose-base":
			return { ...state, base: action.image, mode: PromptMode.Edit };

		case "dismiss":
			return dismissPending(state);

		case "prepared":
			return confirmTurn(state, action.id, action.pending);

		case "set-mode":
			return { ...state, mode: action.mode };

		case "turn-added":
			return addTurn(state, action.id, action.model, action.prompt);

		case "turn-done": {
			const done = settleTurn(state, action.id, {
				finishedAt: action.at,
				phase: TurnPhase.Done,
				result: action.result,
			});
			return { ...done, base: getFirstImage(action.result) ?? state.base };
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

		case "turn-removed":
			return removeTurn(state, action.id);

		case "turn-started": {
			const started = settleTurn(state, action.id, { phase: TurnPhase.Running, startedAt: action.at });
			return { ...started, pending: undefined };
		}

		default:
			return updateTurn(state, action.id, (turn) => ({ ...turn, warnings: [...turn.warnings, action.warning] }));
	}
}
