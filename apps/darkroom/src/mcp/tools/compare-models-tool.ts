import { tool } from "tmcp/utils";

import { executeCompareAsync } from "$compare/execute-compare";
import { planCompareAsync } from "$compare/plan-compare";
import { toGenerationOptions } from "$generation/generation-flags";
import { InterruptGuard } from "$generation/interrupt-guard";

import { checkBudget } from "../cost-gate";
import { loadReferencesAsync } from "../generation-input";
import { prepareAsync } from "../mcp-dependencies";
import { compareModelsInput } from "../schemas";
import { runToolAsync, toCompareResultAsync } from "../to-tool-result";

import type { DarkroomServer } from "../darkroom-server";
import type { McpDependencies } from "../mcp-dependencies";

export function registerCompareModelsTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "compare-models",
			annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true, readOnlyHint: false },
			description:
				"Generate the same prompt with two or more models at once, into one new folder. COSTS MONEY: every model's request is billed by OpenRouter and sent once, with no retries. Set maxCost to refuse a comparison whose total estimate is above it. A model that fails does not stop the others.",
			schema: compareModelsInput,
			title: "Compare models (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const references = await loadReferencesAsync(dependencies, input.images);
				const plan = await planCompareAsync(
					{
						modelIds: input.models,
						options: toGenerationOptions(input),
						prompt: input.prompt,
						references,
					},
					{
						cwd: dependencies.cwd,
						now: dependencies.now,
						async prepare(generationInput) {
							return prepareAsync(dependencies, generationInput);
						},
						warn: dependencies.warn,
					},
					dependencies,
				);

				const check = checkBudget(
					plan.estimates.map(({ estimate }) => estimate),
					input,
				);
				if (!check.isAllowed) return tool.error(check.reason);

				let finished = 0;
				const outcomes = await executeCompareAsync(
					plan.prepared.map((prepared) => ({ guard: new InterruptGuard(), prepared })),
					{
						client: await dependencies.getImagesClientAsync(),
						history: dependencies.history,
						now: dependencies.now,
						report(line) {
							finished += 1;
							server.progress(finished, plan.prepared.length, line);
						},
						warn: dependencies.warn,
					},
				);
				return toCompareResultAsync(plan.batch, plan.directory, outcomes, dependencies);
			}),
	);
}
