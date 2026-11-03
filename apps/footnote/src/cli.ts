/**
 * Keeps `references` in a pnpm workspace's tsconfig files in line with its
 * `workspace:` dependencies. References footnote does not manage are left as
 * they are.
 */
import process, { argv, cwd } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

import { syncReferencesAsync } from "./sync";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.option("--check", "Report stale references and exit 1 instead of writing them.")
	.option("-c, --config <file:file>", "Load this configuration file instead of searching the workspace root.")
	.action(async ({ check, config }) => {
		process.exitCode = await syncReferencesAsync({ check, configFile: config, cwd: cwd() });
	})
	.command("initialize", async () => {
		const { initializeCommand } = await import("./initialize");
		return initializeCommand;
	})
	.alias("init")
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
