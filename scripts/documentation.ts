import { argv } from "node:process";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name";

// Every site under `documentation/` builds to its own `dist/`. GitHub Pages
// takes one artifact per repository, so `assemble` gathers the sites into one
// folder, and `.github/workflows/documentation.yaml` deploys it. `publish`
// runs that workflow from your machine.

const scriptName = getScriptName(true);

const command = createBaseCommand(scriptName, "1.0.0", "Builds, gathers, and publishes the documentation sites.", {
	showHelpWithoutArguments: true,
})
	.command("assemble", async () => {
		const { assembleCommand } = await import("./documentation/assemble-command");
		return assembleCommand;
	})
	.command("list", async () => {
		const { listCommand } = await import("./documentation/list-command");
		return listCommand;
	})
	.command("publish", async () => {
		const { publishCommand } = await import("./documentation/publish-command");
		return publishCommand;
	});

await command.parse(argv.slice(2));
