import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const modelsCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Various subcommands for learning about image models.",
).command("get", async () => {
	const { getCommand } = await import("./get-command");
	return getCommand;
});
