import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const historyCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight("Various subcommands for the usage history of the `darkroom` CLI."),
	{ showHelpWithoutArguments: true },
);
