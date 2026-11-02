import { cwd, stdout } from "node:process";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";

import { getSitesAsync } from "./documentation-sites";

const scriptName = getScriptName(true);

export const listCommand = createBaseCommand(
	scriptName,
	undefined,
	"List the documentation sites and where they publish.",
).action(async () => {
	const sites = await getSitesAsync(cwd());
	stdout.write(sites.map(({ name, url }) => `${name}\t${url}\n`).join(""));
});
