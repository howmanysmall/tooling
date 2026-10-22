import { ValidationError } from "@cliffy/command";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { tool } from "tmcp/utils";

import { getEstimatesAsync } from "$compare/plan-compare";
import { ApiError } from "$errors/api-error";
import { InterruptGuard } from "$generation/interrupt-guard";
import { executeGenerationAsync } from "$generation/run-generation";

import { checkBudget } from "./cost-gate";
import { prepareAsync } from "./mcp-dependencies";
import { toGenerationResultAsync } from "./to-tool-result";

import type { CallToolResult } from "tmcp";

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

export interface PaidGenerationOptions {
	/** Models to try, in order, when an earlier one refuses without billing. */
	readonly fallbackModels?: ReadonlyArray<string> | undefined;
	/** Whether darkroom chose the models, rather than the caller. */
	readonly isPicked?: boolean | undefined;
}

async function attemptAsync(
	server: DarkroomServer,
	dependencies: McpDependencies,
	input: GenerationInput,
	budget: Budget,
	{ isPicked, skipped }: { readonly isPicked: boolean; readonly skipped: ReadonlyArray<string> },
): Promise<CallToolResult<undefined>> {
	const prepared = await prepareAsync(dependencies, input, isPicked);
	const [estimate] = await getEstimatesAsync([prepared], dependencies);
	const check = checkBudget([estimate?.estimate], budget);
	if (!check.isAllowed) {
		return tool.error(check.reason);
	}

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
 * Validates a generation, checks it against the caller's budget, then sends
 * it once, saves the images, and records the run. Shared by
 * `generate-image` and `rerun`.
 *
 * A request is never resent to the same model, since a retry after the
 * provider made an image could bill it twice. When a model refuses the
 * request in a way that bills nothing, the next fallback model gets it.
 *
 * The stdio transport can't abort a call, so a run the client cancels still
 * finishes and saves its images, as the CLI does after Ctrl-C.
 *
 * @param server - Receives streaming progress for the client.
 * @param dependencies - The API client, history, and prices.
 * @param input - What to generate, with the first model to try.
 * @param budget - The caller's spending limit.
 * @param options - Fallback models, and whether darkroom chose them.
 * @param options.fallbackModels - Models to try when an earlier one refuses
 *   without billing.
 * @param options.isPicked - Whether darkroom chose the models.
 * @returns The run, or a tool error saying why nothing was sent.
 * @rejects An `Error` naming the model that failed and any skipped before
 *   it.
 */
export async function runPaidGenerationAsync(
	server: DarkroomServer,
	dependencies: McpDependencies,
	input: GenerationInput,
	budget: Budget,
	{ fallbackModels = [], isPicked = false }: PaidGenerationOptions = {},
): Promise<CallToolResult<undefined>> {
	const modelIds = [input.modelId, ...fallbackModels];
	const skipped: Array<string> = [];
	for (const [index, modelId] of modelIds.entries()) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- try each model only after the last one refused
			return await attemptAsync(server, dependencies, { ...input, modelId }, budget, { isPicked, skipped });
		} catch (error) {
			const superError = error instanceof Error ? error : new Error(String(error), { cause: error });
			const isLast = index === modelIds.length - 1;
			if (isLast || !canTryAnotherModel(superError)) {
				const tried = skipped.length === 0 ? "" : ` Earlier attempts: ${skipped.join(" ")}`;
				throw new Error(`${modelId} failed: ${superError.message}${tried}`, { cause: error });
			}
			skipped.push(`Skipped ${modelId} (${superError.message}); nothing was charged.`);
		}
	}

	throw new Error("No model to try.");
}
