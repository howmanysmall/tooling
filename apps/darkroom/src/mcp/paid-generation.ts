import { ValidationError } from "@cliffy/command";
import { OpenRouterError } from "@openrouter/sdk/models/errors";

import { getEstimatesAsync } from "$compare/plan-compare";
import { ApiError } from "$errors/api-error";
import { InterruptGuard } from "$generation/interrupt-guard";
import { executeGenerationAsync } from "$generation/run-generation";

import { checkBudget } from "./cost-gate";
import { prepareAsync } from "./mcp-dependencies";
import { toGenerationResultAsync } from "./to-tool-result";

import type { CallToolResult } from "tmcp";
import type { Except } from "type-fest";

import type { GenerationInput } from "$generation/run-generation";

import type { Budget } from "./cost-gate";
import type { DarkroomServer } from "./darkroom-server";
import type { McpDependencies } from "./mcp-dependencies";

async function rejectStdoutAsync(): Promise<void> {
	// The schemas refuse `-`, so this only guards against a future caller.
	await Promise.reject(new Error("The MCP server can't write images to stdout; it carries the MCP stream."));
}

/**
 * Statuses where the provider refused the request before making anything, so
 * nothing was billed and another model can be tried: bad parameters, an
 * unknown model, a timeout before work began, rate limits and spent upstream
 * quotas, and an unavailable provider.
 */
const UNBILLED_STATUS_CODES: ReadonlySet<number> = new Set([400, 404, 408, 422, 429, 503]);

/**
 * Whether a failure left nothing billed and could go differently with another
 * model.
 *
 * @param error - What the attempt threw.
 * @returns Whether to try the next model.
 */
function canTryAnotherModel(error: Error): boolean {
	if (error instanceof ValidationError) return true;

	return (
		error instanceof ApiError &&
		error.cause instanceof OpenRouterError &&
		UNBILLED_STATUS_CODES.has(error.cause.statusCode)
	);
}

/** One model to send the request to, and the terms it's sent on. */
export interface ModelAttempt {
	/** The spending limit for this model. */
	readonly budget: Budget;
	/**
	 * Whether darkroom chose the model, so options it doesn't support are
	 * left out instead of refused.
	 */
	readonly isPicked: boolean;
	readonly modelId: string;
}

async function attemptAsync(
	server: DarkroomServer,
	dependencies: McpDependencies,
	input: GenerationInput,
	{ budget, isPicked }: ModelAttempt,
	skipped: ReadonlyArray<string>,
): Promise<CallToolResult<undefined>> {
	const prepared = await prepareAsync(dependencies, input, isPicked);
	const [estimate] = await getEstimatesAsync([prepared], dependencies);
	const check = checkBudget([estimate?.estimate], budget);
	// Thrown, not returned, so a fallback model gets a chance: nothing was sent.
	if (!check.isAllowed) throw new ValidationError(check.reason);

	const result = await executeGenerationAsync(prepared, {
		client: await dependencies.getImagesClientAsync(),
		guard: new InterruptGuard(),
		history: dependencies.history,
		now: dependencies.now,
		onProgress(progress) {
			server.progress(progress.completed, prepared.parameters.count, progress.phase);
		},
		warn: dependencies.warn,
		writeStdoutAsync: rejectStdoutAsync,
	});
	return toGenerationResultAsync(result, [...skipped, ...prepared.warnings], dependencies);
}

/**
 * Validates a generation, checks it against the attempt's budget, then sends
 * it once, saves the images, and records the run. Shared by
 * `generate-image` and `rerun`.
 *
 * A request is never resent to the same model, since a retry after the
 * provider made an image could bill it twice. When a model refuses the
 * request in a way that bills nothing, the next attempt's model gets it.
 *
 * The stdio transport can't abort a call, so a run the client cancels still
 * finishes and saves its images, as the CLI does after Ctrl-C.
 *
 * @param server - Receives streaming progress for the client.
 * @param dependencies - The API client, history, and prices.
 * @param input - What to generate; each attempt sets the model.
 * @param attempts - The models to try, in order.
 * @returns The finished run: its paths, cost, and previews.
 * @rejects An `Error` naming the model that failed or was over budget, and
 *   any skipped before it.
 */
export async function runPaidGenerationAsync(
	server: DarkroomServer,
	dependencies: McpDependencies,
	input: Except<GenerationInput, "modelId">,
	attempts: ReadonlyArray<ModelAttempt>,
): Promise<CallToolResult<undefined>> {
	const skipped: Array<string> = [];
	for (const [index, attempt] of attempts.entries()) {
		const { modelId } = attempt;
		try {
			// oxlint-disable-next-line no-await-in-loop -- try each model only after the last one refused
			return await attemptAsync(server, dependencies, { ...input, modelId }, attempt, skipped);
		} catch (error) {
			const superError = error instanceof Error ? error : new Error(String(error), { cause: error });
			const isLast = index === attempts.length - 1;
			if (isLast || !canTryAnotherModel(superError)) {
				const tried = skipped.length === 0 ? "" : ` Earlier attempts: ${skipped.join(" ")}`;
				throw new Error(`${modelId} failed: ${superError.message}${tried}`, { cause: error });
			}
			skipped.push(`Skipped ${modelId} (${superError.message}); nothing was charged.`);
		}
	}

	throw new Error("No model to try.");
}
