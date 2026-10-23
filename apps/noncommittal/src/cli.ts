import { argv, cwd, stdout } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

import { loadConfigurationAsync } from "./configuration";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.option("-c, --config <file:file>", "Load this configuration file instead of searching for one.")
	.action(async ({ config }) => {
		const { configFile, configuration } = await loadConfigurationAsync({ configFile: config, cwd: cwd() });
		if (configuration.verbose === true) stdout.write(`Configuration: ${configFile ?? "none found"}\n`);
		stdout.write(`Hello from ${scriptName}!\n`);
	})
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
