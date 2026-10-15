import { stderr } from "node:process";
import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { consola } from "consola";

const scriptName = getScriptName(true);
// Logs go to stderr; this command prints no data.
const log = consola.create({ stdout: stderr }).withTag(scriptName);

export const cacheCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight("Regenerate the `darkroom` completion cache."),
).action(async () => {
	log.info("Regenerating the CLI completion cache...");
	await import("$utilities/completion-cache-utilities").then(async ({ refreshCompletionCacheAsync }) =>
		refreshCompletionCacheAsync(false),
	);
	log.success("CLI completion cache regenerated successfully.");
});
