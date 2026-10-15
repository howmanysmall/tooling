#!/usr/bin/env bun

import { argv, stdout } from "node:process";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.action(async function onActionAsync() {
		const { getImageModelIdsAsync } = await import("$validators/image-model-id-type");
		const ids = await getImageModelIdsAsync();
		const stringBuilder = ids.map((value) => `  - ${value}`).join("\n");
		stdout.write(`${stringBuilder}\n`);
	})
	.command("generate", async () => {
		const { generateCommand } = await import("$commands/generate-command");
		return generateCommand;
	})
	.command("cache", async () => {
		const { cacheCommand } = await import("$commands/cache-command");
		return cacheCommand;
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
