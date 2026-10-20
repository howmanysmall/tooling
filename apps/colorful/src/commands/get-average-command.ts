import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

const scriptName = getScriptName(true);

export const getAverageCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight("Gets the average color of a given image."),
).action(async () => {
	// does nothing... yet!
});
