import { cwd } from "node:process";
import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const mcpCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight(
		"Serve darkroom's tools to MCP clients over stdio. stdout carries the MCP stream; logs go to stderr.",
	),
).action(async () => {
	const [{ StdioTransport }, { createDarkroomServer }, { createDefaultDependenciesAsync }] = await Promise.all([
		import("@tmcp/transport-stdio"),
		import("$mcp/create-server"),
		import("$mcp/mcp-dependencies"),
	]);
	const server = createDarkroomServer(await createDefaultDependenciesAsync(cwd()));
	new StdioTransport(server).listen();
});
