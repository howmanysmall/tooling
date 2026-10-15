import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const historyCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight("Various subcommands for the usage history of the `darkroom` CLI."),
	{ showHelpWithoutArguments: true },
)
	.command("list", async () => {
		const { listCommand } = await import("./list-command");
		return listCommand;
	})
	.command("open", async () => {
		const { openCommand } = await import("./open-command");
		return openCommand;
	})
	.command("prune", async () => {
		const { pruneCommand } = await import("./prune-command");
		return pruneCommand;
	})
	.command("rerun", async () => {
		const { rerunCommand } = await import("./rerun-command");
		return rerunCommand;
	})
	.command("show", async () => {
		const { showCommand } = await import("./show-command");
		return showCommand;
	});
