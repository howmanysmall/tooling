import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";

const scriptName = getScriptName(true);

export const generateCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Generate a new image using OpenRouter's image generation API.",
)
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.option("--model <model:image-model>", "The OpenRouter model to use for generating images.")
	.action(async ({ model }) => {
		console.log(`Generating an image using model: ${model}`);
		await fetch("https://example.org");
	});
