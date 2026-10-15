import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const modelsCommand = createBaseCommand(
	scriptName,
	"1.1.0",
	"Various subcommands for learning about image models.",
	{ showHelpWithoutArguments: true },
)
	.command("get", async () => {
		const { getCommand } = await import("./get-command");
		return getCommand;
	})
	.command("list", async () => {
		const { listCommand } = await import("./list-command");
		return listCommand;
	});
