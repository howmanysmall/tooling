#!/usr/bin/env bun

import { argv, stdout } from "node:process";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.action(async function onActionAsync() {
		const { getOpenRouterImageModelsAsync } = await import("$validators/openrouter-model-type");
		const imageModels = await getOpenRouterImageModelsAsync();
		const stringBuilder = imageModels.map((value) => `  - ${value}`).join("\n");
		stdout.write(`${stringBuilder}\n`);
	})
	.command("generate", async () => {
		const { generateCommand } = await import("$commands/generate-command");
		return generateCommand;
	})
	.command("completions", async () => {
		const { CompletionsCommand } = await import("@cliffy/command/completions");
		return new CompletionsCommand();
	})
	.command("help", async () => {
		const { HelpCommand } = await import("@cliffy/command/help");
		return new HelpCommand().global();
	});

await command.parse(argv.slice(2));
