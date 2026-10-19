import { tool } from "tmcp/utils";

import { getModelPrices } from "$generation/observed-prices";
import { getModelInput } from "$mcp/schemas";
import { runToolAsync, toJsonResult } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerGetModelTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "get-model",
			annotations: { openWorldHint: false, readOnlyHint: true },
			description:
				"Get one image model's details: the parameters it accepts and their allowed values, and its prices per provider.",
			schema: getModelInput,
			title: "Get an image model",
		},
		async ({ model: modelId }) =>
			runToolAsync(async () => {
				const [models, pricing, observed] = await Promise.all([
					dependencies.getModelsAsync(),
					dependencies.getPricingAsync(),
					dependencies.getObservedPricesAsync(),
				]);
				const model = models.find((item) => item.id === modelId);
				if (model === undefined) {
					return tool.error(`Unknown model "${modelId}". Use list-models to see the options.`);
				}

				return toJsonResult({ ...model, prices: getModelPrices(pricing, observed, model.id) });
			}),
	);
}
