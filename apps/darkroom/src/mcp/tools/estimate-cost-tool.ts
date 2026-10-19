import { collectPrepared, describeTotalCost } from "$compare/compare-plan";
import { getEstimatesAsync } from "$compare/plan-compare";
import { describeRequest } from "$generation/format-result";
import { toGenerationOptions } from "$generation/generation-flags";
import { loadReferencesAsync } from "$mcp/generation-input";
import { prepareAsync } from "$mcp/mcp-dependencies";
import { estimateCostInput } from "$mcp/schemas";
import { runToolAsync, toJsonResult } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerEstimateCostTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "estimate-cost",
			annotations: { openWorldHint: false, readOnlyHint: true },
			description:
				"Validate a generation for one or more models and estimate what it would cost, without sending anything. Use it before generate-image or compare-models to pick a maxCost.",
			schema: estimateCostInput,
			title: "Estimate cost",
		},
		async (input) =>
			runToolAsync(async () => {
				const references = await loadReferencesAsync(dependencies, input.images);
				const options = toGenerationOptions(input);
				const settled = await Promise.allSettled(
					input.models.map(async (modelId) =>
						prepareAsync(dependencies, {
							force: false,
							modelId,
							options,
							prompt: input.prompt,
							references,
						}),
					),
				);
				const prepared = collectPrepared(settled);
				const estimates = await getEstimatesAsync(prepared, dependencies);

				return toJsonResult({
					models: prepared.map((item, index) => ({
						estimate: estimates[index]?.text ?? "unknown",
						model: item.model.id,
						request: describeRequest(item),
						usd: estimates[index]?.estimate?.usd,
						warnings: item.warnings,
					})),
					total: describeTotalCost(estimates.map(({ estimate }) => estimate)),
				});
			}),
	);
}
