import { toGenerationOptions } from "$generation/generation-flags";
import { loadReferencesAsync } from "$mcp/generation-input";
import { chooseModels, MAX_ATTEMPTS, MAX_PICKED_PRICE } from "$mcp/model-choice";
import { runPaidGenerationAsync } from "$mcp/paid-generation";
import { generateImageInput } from "$mcp/schemas";
import { runToolAsync } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerGenerateImageTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "generate-image",
			annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true, readOnlyHint: false },
			description:
				"Generate an image from a prompt. Only prompt is needed: darkroom picks a good model costing at most $0.10 an image, leaves out options the model doesn't take, and moves to another model when one is unavailable. The result has the image attached, so the user can see it, plus the path it was saved to. COSTS MONEY (usually a few cents); set maxCost to cap it.",
			schema: generateImageInput,
			title: "Generate an image (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const references = await loadReferencesAsync(dependencies, input.images);
				const options = toGenerationOptions(input);
				const generation = { force: input.force === true, options, prompt: input.prompt, references };
				// A model the user chose, here or as DARKROOM_MODEL,
				// runs under the caller's budget alone.
				const chosen = input.model ?? dependencies.defaultModel;
				const chosenAttempts =
					chosen === undefined ? [] : [{ budget: input, isPicked: false, modelId: chosen }];
				if (input.model !== undefined) {
					return runPaidGenerationAsync(server, dependencies, generation, chosenAttempts);
				}

				const [models, pricing, observed] = await Promise.all([
					dependencies.getModelsAsync(),
					dependencies.getPricingAsync(),
					dependencies.getObservedPricesAsync(),
				]);
				// List prices can be the cheapest variant, so cap
				// the estimate for this request's settings too.
				const pickedBudget = {
					allowUnknownCost: input.allowUnknownCost,
					maxCost: input.maxCost ?? MAX_PICKED_PRICE * (input.count ?? 1),
				};
				const picked = chooseModels(
					models,
					{ ...options, referenceCount: references.length },
					{ observed, pricing },
				).filter((modelId) => modelId !== chosen);
				const attempts = [
					...chosenAttempts,
					...picked.map((modelId) => ({ budget: pickedBudget, isPicked: true, modelId })),
				].slice(0, MAX_ATTEMPTS);
				if (attempts.length === 0) {
					throw new Error(
						`No model priced at $${MAX_PICKED_PRICE} or less per image can serve this request. Drop some options, or pass a model the user chose.`,
					);
				}

				return runPaidGenerationAsync(server, dependencies, generation, attempts);
			}),
	);
}
