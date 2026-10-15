import { mergeRerunOptions } from "$generation/generation-flags";
import { InterruptGuard } from "$generation/interrupt-guard";
import { getReferenceRange } from "$generation/model-capabilities";
import { loadReferenceAsync } from "$generation/references";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { runBrowserTask } from "$interactive/app/run-browser-task";

import { restoreTurnAsync } from "./restore-turns";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { StreamProgress } from "$generation/image-stream";
import type { GenerationInput, GenerationResult, PreparedGeneration } from "$generation/run-generation";
import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { RestoredTurn } from "./restore-turns";
import type { BaseImage, PendingRequest } from "./session-state";

/** What to generate: a new prompt, or a past run again. */
export type SessionRequest =
	| {
			/** The image to edit, or `undefined` to start fresh. */
			readonly base?: BaseImage | undefined;
			readonly model: ImageModelListItem;
			readonly prompt: string;
			readonly type: "new";
	  }
	| { readonly entry: HistoryEntry; readonly type: "rerun" };

/** Where a running generation reports to. */
export interface RunHandlers {
	readonly onDone: (result: GenerationResult) => void;
	readonly onFailed: (message: string) => void;
	readonly onProgress: (progress: StreamProgress) => void;
	readonly onWarning: (warning: string) => void;
}

/** How a generation that was still running when the app closed ended. */
export interface SettledRun {
	readonly error?: string | undefined;
	readonly prompt: string;
	readonly result?: GenerationResult | undefined;
}

/**
 * How the session validates, prices, and sends requests. A sent request is
 * never canceled: the provider may already be charging for it, so it runs
 * until its images are saved, even after the app closes.
 */
export interface SessionServices {
	/** How many requests are still generating or saving. */
	readonly getRunningCount: () => number;
	/**
	 * Validates and prices a request, without spending anything.
	 *
	 * @param request - What to generate.
	 * @param session - The session to save the run under.
	 */
	readonly prepareAsync: (request: SessionRequest, session: string) => Promise<PendingRequest>;
	/** Rebuilds a session's finished turns from its runs, oldest first. */
	readonly restoreAsync: (runs: ReadonlyArray<HistoryEntry>) => Promise<Array<RestoredTurn>>;
	/** Sends a confirmed request. */
	readonly start: (prepared: PreparedGeneration, handlers: RunHandlers) => void;
	/** Waits for every running request to be saved, or to fail. */
	readonly waitForRunningAsync: () => Promise<Array<SettledRun>>;
}

function canTakeImages(model: ImageModelListItem): boolean {
	return getReferenceRange(model).max > 0;
}

async function toInputAsync(request: SessionRequest, session: string, store: HistoryStore): Promise<GenerationInput> {
	if (request.type === "new") {
		const { base, model, prompt } = request;
		const isEditing = base !== undefined && canTakeImages(model);
		const references = isEditing ? [await loadReferenceAsync(base.path)] : [];
		return { force: false, modelId: model.id, options: {}, prompt, references, session };
	}

	const { entry } = request;
	return {
		force: false,
		modelId: entry.model,
		options: mergeRerunOptions(entry),
		parent: entry.id,
		prompt: entry.prompt,
		references: await loadStoredReferencesAsync(entry, store),
		session,
	};
}

async function runAsync(prepared: PreparedGeneration, handlers: RunHandlers): Promise<SettledRun> {
	const { prompt } = prepared.input;
	try {
		const { generateQuietlyAsync } = await import("$generation/cli-runner");
		const result = await generateQuietlyAsync(prepared, {
			// Never interrupted: the app has no way to cancel a sent request.
			guard: new InterruptGuard(),
			onProgress: handlers.onProgress,
			warn: handlers.onWarning,
		});
		handlers.onDone(result);
		return { prompt, result };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		handlers.onFailed(message);
		return { error: message, prompt };
	}
}

/**
 * Builds the session's services on the generation core, without printing
 * or handling signals, so they can run inside the full-screen app.
 *
 * @param store - The history store, for re-runs' stored references.
 * @returns Services that prepare, send, and wait for requests.
 */
export function createSessionServices(store: HistoryStore): SessionServices {
	const running = new Set<Promise<SettledRun>>();

	return {
		getRunningCount: () => running.size,
		async prepareAsync(request, session): Promise<PendingRequest> {
			const { describeCostAsync, prepareQuietlyAsync } = await import("$generation/cli-runner");
			const prepared = await prepareQuietlyAsync(await toInputAsync(request, session, store));
			const cost = await describeCostAsync(prepared, () => undefined);
			if (request.type === "rerun" || request.base === undefined || canTakeImages(request.model)) {
				return { cost, prepared };
			}

			// Said before anything is spent, so you can pick a model that edits.
			const note = `${prepared.model.name} can't take images, so this starts fresh instead of editing.`;
			return { cost, prepared: { ...prepared, warnings: [...prepared.warnings, note] } };
		},
		async restoreAsync(runs): Promise<Array<RestoredTurn>> {
			return Promise.all(runs.map(async (entry) => restoreTurnAsync(entry, store)));
		},
		start(prepared, handlers): void {
			const run = runAsync(prepared, handlers);
			running.add(run);
			runBrowserTask(
				run.then(() => undefined),
				() => {
					running.delete(run);
				},
			);
		},
		async waitForRunningAsync(): Promise<Array<SettledRun>> {
			return Promise.all(running);
		},
	};
}
