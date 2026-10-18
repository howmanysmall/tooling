import { stderr } from "node:process";

import { CHARGE_NOTE } from "$errors/to-api-error";
import { executeGenerationAsync } from "$generation/run-generation";

import { formatOutcomeLine } from "./compare-format";

import type { InterruptGuard } from "$generation/interrupt-guard";
import type { ExecutionDependencies, GenerationResult, PreparedGeneration } from "$generation/run-generation";

import type { CompareOutcome } from "./compare-format";

export interface CompareRun {
	/** Its own guard, so Ctrl-C can abort it or let it finish saving. */
	readonly guard: InterruptGuard;
	readonly prepared: PreparedGeneration;
}

export interface CompareDependencies extends Pick<ExecutionDependencies, "client" | "history" | "now"> {
	/** Receives each finished model's line. Defaults to stderr. */
	readonly report?: ((line: string) => void) | undefined;
	readonly warn: (message: string) => void;
}

function describeIncomplete(result: GenerationResult): string | undefined {
	if (result.providerError !== undefined) return `The provider stopped early: ${result.providerError} ${CHARGE_NOTE}`;
	if (result.failures.length === 0) return undefined;

	const details = result.failures.map((failure) => `${failure.message} (saved to ${failure.recoveredPath})`);
	return `Some images could not be written where asked: ${details.join("; ")}`;
}

async function rejectStdoutAsync(): Promise<void> {
	// compare only writes into its folder, never to stdout.
	await Promise.reject(new Error("compare does not write images to stdout."));
}

function writeLine(line: string): void {
	stderr.write(`${line}\n`);
}

async function runOneAsync(
	{ guard, prepared }: CompareRun,
	dependencies: CompareDependencies,
): Promise<CompareOutcome> {
	const model = prepared.model.id;
	const started = performance.now();
	let outcome: CompareOutcome;
	try {
		const result = await executeGenerationAsync(prepared, {
			client: dependencies.client,
			guard,
			history: dependencies.history,
			now: dependencies.now,
			warn(message) {
				dependencies.warn(`${model}: ${message}`);
			},
			writeStdoutAsync: rejectStdoutAsync,
		});
		const elapsedMs = performance.now() - started;
		const problem = describeIncomplete(result);
		outcome =
			problem === undefined
				? { elapsedMs, model, result, status: "ok" }
				: { elapsedMs, error: problem, model, result, status: "failed" };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		outcome = { elapsedMs: performance.now() - started, error: message, model, status: "failed" };
	}

	(dependencies.report ?? writeLine)(formatOutcomeLine(outcome));
	return outcome;
}

/**
 * Sends every model's request at once, one request each with no retries. A
 * model that fails does not stop the others, and every image that arrives is
 * saved and recorded.
 *
 * @param runs - The prepared requests with their interrupt guards.
 * @param dependencies - The API client, history, clock, and where lines go.
 * @returns Each model's outcome, in the order of `runs`.
 */
export async function executeCompareAsync(
	runs: ReadonlyArray<CompareRun>,
	dependencies: CompareDependencies,
): Promise<Array<CompareOutcome>> {
	return Promise.all(runs.map(async (run) => runOneAsync(run, dependencies)));
}
