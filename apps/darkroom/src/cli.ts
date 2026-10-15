#!/usr/bin/env bun

import "$polyfills/color-only-on-terminals";

import { argv, stdin, stdout } from "node:process";
import { ValidationError } from "@cliffy/command";
import { HelpCommand } from "@cliffy/command/help";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { description, version } from "$constants";
import { AppTab } from "$interactive/app/app-tab";

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, version, description)
	.action(async () => {
		if (!stdin.isTTY || !stdout.isTTY) {
			throw new ValidationError("Interactive mode needs a terminal. Use a command such as `darkroom generate`.");
		}
		const { openDarkroomAsync } = await import("$interactive/app/open-darkroom");
		await openDarkroomAsync({ tab: AppTab.Generate });
	})
	.command("generate", async () => {
		const { generateCommand } = await import("$commands/generate-command");
		return generateCommand;
	})
	.command("compare", async () => {
		const { compareCommand } = await import("$commands/compare-command");
		return compareCommand;
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
	.command("mcp", async () => {
		const { mcpCommand } = await import("$commands/mcp-command");
		return mcpCommand;
	})
	.command("completions", async () => {
		const { completionsCommand } = await import("$commands/completions-command");
		return completionsCommand;
	})
	.command("help", new HelpCommand().global());

await command.parse(argv.slice(2));
