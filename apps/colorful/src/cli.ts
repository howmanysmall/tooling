import { argv } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.command("get-average", async () => {
		const { getAverageCommand } = await import("$commands/get-average-command");
		return getAverageCommand;
	})
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
