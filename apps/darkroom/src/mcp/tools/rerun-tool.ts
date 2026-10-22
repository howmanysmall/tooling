import { mergeRerunOptions } from "$generation/generation-flags";
import { readAllAsync } from "$history/history-store";
import { resolveRunReference } from "$history/resolve-run-reference";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { loadReferencesAsync } from "$mcp/generation-input";
import { runPaidGenerationAsync } from "$mcp/paid-generation";
import { rerunInput } from "$mcp/schemas";
import { runToolAsync } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

export function registerRerunTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "rerun",
			annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true, readOnlyHint: false },
			description:
				"Repeat a past run with its stored prompt, settings, and reference images; any field given overrides the stored value. COSTS MONEY like generate-image. Set maxCost to refuse requests estimated above it. Images go to new files, never the old run's names.",
			schema: rerunInput,
			title: "Re-run a past run (paid)",
		},
		async (input) =>
			runToolAsync(async () => {
				const { history } = dependencies;
				const entries = await readAllAsync(history, dependencies.warn);
				const entry = resolveRunReference(entries, input.run);
				const references =
					input.images === undefined
						? await loadStoredReferencesAsync(entry, history)
						: await loadReferencesAsync(dependencies, input.images);

				return runPaidGenerationAsync(
					server,
					dependencies,
					{
						force: input.force === true,
						options: mergeRerunOptions(entry, input),
						parent: entry.id,
						prompt: entry.prompt,
						references,
					},
					[{ budget: input, isPicked: false, modelId: input.model ?? entry.model }],
				);
			}),
	);
}
