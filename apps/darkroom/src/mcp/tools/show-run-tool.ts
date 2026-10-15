import { readAllAsync, resolve } from "$history/history-store";
import { getRunRelations, resolveRunReference } from "$history/resolve-run-reference";

import { showRunInput } from "../schemas";
import { runToolAsync, toJsonResult } from "../to-tool-result";

import type { DarkroomServer } from "../darkroom-server";
import type { McpDependencies } from "../mcp-dependencies";

export function registerShowRunTool(server: DarkroomServer, dependencies: McpDependencies): void {
	server.tool(
		{
			name: "show-run",
			annotations: { openWorldHint: false, readOnlyHint: true },
			description:
				"Show one past run: its prompt, settings, cost, where its images were written, the history copies, and related runs (what it was re-run from, and the other runs of its comparison).",
			schema: showRunInput,
			title: "Show a past run",
		},
		async ({ run }) =>
			runToolAsync(async () => {
				const { history } = dependencies;
				const entries = await readAllAsync(history, dependencies.warn);
				const entry = resolveRunReference(entries, run);
				const { batch, parents } = getRunRelations(entries, entry);

				return toJsonResult({
					...entry,
					images: entry.images.map(({ mediaType, output, stored }) => ({
						mediaType,
						output,
						stored: resolve(history, stored),
					})),
					references: entry.references.map(({ source, stored }) => ({
						source,
						stored: resolve(history, stored),
					})),
					related: {
						batch: batch.map(({ id, model }) => ({ id, model })),
						parents: parents.map(({ id, model }) => ({ id, model })),
					},
				});
			}),
	);
}
