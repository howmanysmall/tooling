import { tool } from "tmcp/utils";

import { toGenerationOptions } from "$generation/generation-flags";
import { loadReferencesAsync } from "$mcp/generation-input";
import { runPaidGenerationAsync } from "$mcp/paid-generation";
import { createGenerateImageInput } from "$mcp/schemas";
import { runToolAsync } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerGenerateImageTool(server: DarkroomServer, dependencies: McpDependencies): void {
	const { defaultModel } = dependencies;
	const modelHint =
		defaultModel === undefined
			? "Pass model: no default is set, so pick one first (list-models with sort price shows the cheapest)."
			: `Uses ${defaultModel} unless model names another.`;

	server.tool(
		{
			name: "generate-image",
			annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true, readOnlyHint: false },
			description: `Generate images with one model. ${modelHint} COSTS MONEY: the request is billed by OpenRouter and sent once, with no retries. Set maxCost to refuse requests estimated above it. Images are saved to output (default: the current directory) and recorded in the history; the result lists their paths and includes previews.`,
			schema: createGenerateImageInput(defaultModel),
			title: "Generate images (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const modelId = input.model ?? defaultModel;
				if (modelId === undefined) {
					return tool.error("No model chosen. Pass model; list-models shows the options.");
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
