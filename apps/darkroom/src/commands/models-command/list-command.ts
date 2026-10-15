import { stderr } from "node:process";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { bold } from "ansis";
import { consola } from "consola";

import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";

const scriptName = getScriptName(true);
const log = consola.create({ stdout: stderr }).withTag(scriptName);

export const listCommand = createBaseCommand(scriptName, "1.0.0", "NYI")
	.env("OPENROUTER_API_KEY=<value:string>", "The OpenRouter API key to use for generating images.", {})
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.argument("[search:string]", "The search term to filter the list of image models.")
	.action(() => {
		log.info(`The ${bold(scriptName)} command is not yet implemented. Please check back later.`);
	});
