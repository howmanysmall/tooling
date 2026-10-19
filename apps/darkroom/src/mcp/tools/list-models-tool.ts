import { getCountRange, getEnumValues, getReferenceRange } from "$generation/model-capabilities";
import { describeListPrice, getModelPrices } from "$generation/observed-prices";
import { listModelsInput } from "$mcp/schemas";
import { runToolAsync, toJsonResult } from "$mcp/to-tool-result";
import { filterModels, sortModels } from "$utilities/model-filters";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerListModelsTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "list-models",
			annotations: { openWorldHint: false, readOnlyHint: true },
			description:
				"List the image models on OpenRouter, with their price and limits. Filters narrow the list; use get-model for one model's parameters.",
			schema: listModelsInput,
			title: "List image models",
		},
		async (input) =>
			runToolAsync(async () => {
				const [models, pricing, observed] = await Promise.all([
					dependencies.getModelsAsync(),
					dependencies.getPricingAsync(),
					dependencies.getObservedPricesAsync(),
				]);
				const filtered = filterModels(models, input);
				const sorted =
					input.sort === undefined ? filtered : sortModels(filtered, input.sort, pricing, observed);

				return toJsonResult(
					sorted.map((model) => ({
						id: model.id,
						name: model.name,
						aspectRatios: getEnumValues(model, "aspect_ratio"),
						maxImages: getCountRange(model).max,
						maxReferences: getReferenceRange(model).max,
						price: describeListPrice(getModelPrices(pricing, observed, model.id)),
					})),
				);
			}),
	);
}
