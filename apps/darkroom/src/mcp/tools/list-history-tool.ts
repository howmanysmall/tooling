import { readAllAsync } from "$history/history-store";
import { listHistoryInput } from "$mcp/schemas";
import { runToolAsync, toJsonResult } from "$mcp/to-tool-result";

import type { DarkroomServer } from "$mcp/darkroom-server";
import type { McpDependencies } from "$mcp/mcp-dependencies";

const DEFAULT_LIMIT = 20;

export function registerListHistoryTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "list-history",
			annotations: { openWorldHint: false, readOnlyHint: true },
			description:
				"List past runs, newest first: ID, model, prompt, image count, and cost. Use show-run for one run's settings and file paths.",
			schema: listHistoryInput,
			title: "List past runs",
		},
		async ({ limit = DEFAULT_LIMIT }) =>
			runToolAsync(async () => {
				const entries = await readAllAsync(dependencies.history, dependencies.warn);
				const newest = entries.toReversed().slice(0, limit);
				return toJsonResult({
					runs: newest.map((entry) => ({
						id: entry.id,
						batch: entry.batch,
						cost: entry.cost,
						created: entry.created,
						images: entry.returned,
						model: entry.model,
						parent: entry.parent,
						prompt: entry.prompt,
					})),
					total: entries.length,
				});
			}),
	);
}
