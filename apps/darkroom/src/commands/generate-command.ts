import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const generateCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Generate a new image using OpenRouter's image generation API.",
);
