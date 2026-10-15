import { tool } from "tmcp/utils";

import { getEstimatesAsync } from "$compare/plan-compare";
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
 * Validates a generation, checks it against the caller's budget, then sends
 * it once, saves the images, and records the run. Shared by
 * `generate-image` and `rerun`.
 *
 * The stdio transport can't abort a call, so a run the client cancels still
 * finishes and saves its images, as the CLI does after Ctrl-C.
 *
 * @param server - Receives streaming progress for the client.
 * @param dependencies - The API client, history, and prices.
 * @param input - What to generate.
 * @param budget - The caller's spending limit.
 * @returns The run, or a tool error saying why nothing was sent.
 */
export async function runPaidGenerationAsync(
	server: DarkroomServer,
	dependencies: McpDependencies,
	input: GenerationInput,
	budget: Budget,
): Promise<CallToolResult<undefined>> {
	const prepared = await prepareAsync(dependencies, input);
	const [estimate] = await getEstimatesAsync([prepared], dependencies);
	const check = checkBudget([estimate?.estimate], budget);
	if (!check.isAllowed) return tool.error(check.reason);

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
	return toGenerationResultAsync(result, prepared.warnings, dependencies);
}
