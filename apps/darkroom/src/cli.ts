#!/usr/bin/env bun

import { argv } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description, { showHelpWithoutArguments: true })
	.command("generate", async () => {
		const { generateCommand } = await import("$commands/generate-command");
		return generateCommand;
	})
	.command("cache", async () => {
		const { cacheCommand } = await import("$commands/cache-command");
		return cacheCommand;
	})
	.command("history", async () => {
		const { historyCommand } = await import("$commands/history-command");
		return historyCommand;
	})
	.command("models", async () => {
		const { modelsCommand } = await import("$commands/models-command");
		return modelsCommand;
	})
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
