import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { consola } from "consola";

const scriptName = getScriptName(true);
const log = consola.withTag(scriptName);

export const cacheCommand = createBaseCommand(scriptName, "1.0.0", "Regenerate the CLI completion cache.").action(
	async () => {
		log.info("Regenerating the CLI completion cache...");
		await import("$utilities/completion-cache-utilities").then(async ({ refreshCompletionCacheAsync }) =>
			refreshCompletionCacheAsync(false),
		);
		log.success("CLI completion cache regenerated successfully.");
	},
);
