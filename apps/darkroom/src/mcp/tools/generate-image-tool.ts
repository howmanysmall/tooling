import { tool } from "tmcp/utils";

import { toGenerationOptions } from "$generation/generation-flags";
import { loadReferencesAsync } from "$mcp/generation-input";
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
				"Generate images with one model. COSTS MONEY: the request is billed by OpenRouter and sent once, with no retries. Set maxCost to refuse requests estimated above it. Images are saved to output (default: the current directory) and recorded in the history; the result lists their paths and includes previews.",
			schema: generateImageInput,
			title: "Generate images (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const modelId = input.model ?? (await dependencies.getDefaultModelAsync());
				if (modelId === undefined) {
					return tool.error("No model chosen. Pass model, or set DARKROOM_MODEL for the server.");
				}

				const references = await loadReferencesAsync(dependencies, input.images);
				return runPaidGenerationAsync(
					server,
					dependencies,
					{
						force: input.force === true,
						modelId,
						options: toGenerationOptions(input),
						prompt: input.prompt,
						references,
					},
					input,
				);
			}),
	);
}
