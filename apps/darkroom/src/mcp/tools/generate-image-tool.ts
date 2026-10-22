import { toGenerationOptions } from "$generation/generation-flags";
import { loadReferencesAsync } from "$mcp/generation-input";
import { chooseModels } from "$mcp/model-choice";
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
				"Generate an image from a prompt. Only prompt is needed: darkroom picks a good model, leaves out options the model doesn't take, and moves to another model when one is unavailable. The result has the image attached, so the user can see it, plus the path it was saved to. COSTS MONEY (usually a few cents); set maxCost to cap it.",
			schema: generateImageInput,
			title: "Generate an image (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const references = await loadReferencesAsync(dependencies, input.images);
				const options = toGenerationOptions(input);
				const generation = { force: input.force === true, options, prompt: input.prompt, references };
				if (input.model !== undefined) {
					return runPaidGenerationAsync(server, dependencies, { ...generation, modelId: input.model }, input);
				}

				const [first, ...fallbackModels] = chooseModels(
					await dependencies.getModelsAsync(),
					{ ...options, referenceCount: references.length },
					dependencies.defaultModel,
				);
				if (first === undefined) {
					throw new Error("No image model can serve this request. Try fewer options or no reference images.");
				}

				return runPaidGenerationAsync(server, dependencies, { ...generation, modelId: first }, input, {
					fallbackModels,
					isPicked: true,
				});
			}),
	);
}
