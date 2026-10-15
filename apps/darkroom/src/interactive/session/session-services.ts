import { mergeRerunOptions } from "$generation/generation-flags";
import { InterruptGuard } from "$generation/interrupt-guard";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { runBrowserTask } from "$interactive/app/run-browser-task";
import { OutputFormat } from "$validators/output-format-type";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { StreamProgress } from "$generation/image-stream";
import type { GenerationInput, GenerationResult, PreparedGeneration } from "$generation/run-generation";
import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { PendingRequest } from "./session-state";

/** What to generate: a new prompt, or a past run again. */
export type SessionRequest =
	| { readonly entry: HistoryEntry; readonly type: "rerun" }
	| { readonly model: ImageModelListItem; readonly prompt: string; readonly type: "new" };

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
	/** Validates and prices a request, without spending anything. */
	readonly prepareAsync: (request: SessionRequest) => Promise<PendingRequest>;
	/** Sends a confirmed request. */
	readonly start: (prepared: PreparedGeneration, handlers: RunHandlers) => void;
	/** Waits for every running request to be saved, or to fail. */
	readonly waitForRunningAsync: () => Promise<Array<SettledRun>>;
}

async function toInputAsync(request: SessionRequest, store: HistoryStore): Promise<GenerationInput> {
	if (request.type === "new") {
		return { force: false, modelId: request.model.id, options: {}, prompt: request.prompt, references: [] };
	}

	const { entry } = request;
	return {
		force: false,
		modelId: entry.model,
		options: mergeRerunOptions(entry, { format: OutputFormat.Pretty }),
		parent: entry.id,
		prompt: entry.prompt,
		references: await loadStoredReferencesAsync(entry, store),
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
		async prepareAsync(request): Promise<PendingRequest> {
			const { describeCostAsync, prepareQuietlyAsync } = await import("$generation/cli-runner");
			const prepared = await prepareQuietlyAsync(await toInputAsync(request, store));
			const cost = await describeCostAsync(prepared, () => undefined);
			return { cost, prepared };
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
