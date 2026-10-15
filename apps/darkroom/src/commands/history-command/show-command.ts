import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { bold } from "ansis";
import { consola } from "consola";

const scriptName = getScriptName(true);
const log = consola.withTag(scriptName);

export const showCommand = createBaseCommand(scriptName, "1.0.0", "NYI").action(() => {
	log.info(`The ${bold(scriptName)} command is not yet implemented. Please check back later.`);
});
