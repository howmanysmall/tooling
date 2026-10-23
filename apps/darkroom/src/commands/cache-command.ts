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
	renderHighlight("Refresh the cached model list, prices, and shell completions."),
).action(async () => {
	log.info("Refreshing the model, price, and completion caches...");

	const [{ refreshCompletionCacheAsync }, { getModelPricingAsync }] = await Promise.all([
		import("$utilities/completion-cache-utilities"),
		import("$utilities/model-pricing-utilities"),
	]);

	await refreshCompletionCacheAsync(false);
	await getModelPricingAsync(false, (message) => {
		log.warn(message);
	});
	log.success("Caches refreshed.");
});
