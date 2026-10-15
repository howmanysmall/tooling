import { stdin, stdout } from "node:process";
import { ValidationError } from "@cliffy/command";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { AppTab } from "$interactive/app-tab";

const scriptName = getScriptName(true);

export const browseCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Browse past runs full-screen: open, copy, re-run, or delete them.",
).action(async () => {
	if (!stdin.isTTY || !stdout.isTTY) {
		throw new ValidationError("history browse needs a terminal. Use history list instead.");
	}
	// React and Ink only load for this command.
	const { openDarkroomAsync } = await import("$interactive/open-darkroom");
	await openDarkroomAsync({ tab: AppTab.History });
});
