import { ArktypeJsonSchemaAdapter } from "@tmcp/adapter-arktype";
import { McpServer } from "tmcp";

import { description, version } from "$constants";

import { registerCompareModelsTool } from "./tools/compare-models-tool";
import { registerEstimateCostTool } from "./tools/estimate-cost-tool";
import { registerGenerateImageTool } from "./tools/generate-image-tool";
import { registerGetModelTool } from "./tools/get-model-tool";
import { registerListHistoryTool } from "./tools/list-history-tool";
import { registerListModelsTool } from "./tools/list-models-tool";
import { registerRerunTool } from "./tools/rerun-tool";
import { registerShowRunTool } from "./tools/show-run-tool";

import type { DarkroomServer } from "./darkroom-server";
import type { McpDependencies } from "./mcp-dependencies";

const INSTRUCTIONS =
	"darkroom makes images with OpenRouter's image models. To make one, call generate-image with just a prompt: darkroom picks the model, saves the image, and attaches it to the result, where the user can see it. Don't call list-models or estimate-cost first, and only pass model or other options when the user asks for them. Each image costs money, usually a few cents. compare-models runs one prompt on several models, and list-history, show-run, and rerun work with past runs.";

/**
 * Builds the MCP server with every darkroom tool registered.
 *
 * @param dependencies - What the tools use to reach OpenRouter, the caches,
 *   and the history.
 * @returns The server, ready for a transport.
 */
export function createDarkroomServer(dependencies: McpDependencies): DarkroomServer {
	const server: DarkroomServer = new McpServer(
		{ name: "darkroom", description, version },
		{
			adapter: new ArktypeJsonSchemaAdapter(),
			capabilities: { tools: {} },
			instructions: INSTRUCTIONS,
		},
	);

	registerListModelsTool(server, dependencies);
	registerGetModelTool(server, dependencies);
	registerEstimateCostTool(server, dependencies);
	registerGenerateImageTool(server, dependencies);
	registerCompareModelsTool(server, dependencies);
	registerListHistoryTool(server, dependencies);
	registerShowRunTool(server, dependencies);
	registerRerunTool(server, dependencies);
	return server;
}
