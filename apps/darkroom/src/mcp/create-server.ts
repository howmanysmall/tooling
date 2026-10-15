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
	"darkroom generates images with OpenRouter's image models. generate-image, compare-models, and rerun cost money: check prices with estimate-cost first and pass maxCost. Images are saved to disk and recorded in a history that list-history and show-run read.";

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
		{ adapter: new ArktypeJsonSchemaAdapter(), capabilities: { tools: {} }, instructions: INSTRUCTIONS },
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
