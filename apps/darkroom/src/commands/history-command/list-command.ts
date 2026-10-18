import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { readAllAsync } from "$history/history-store";
import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";

const scriptName = getScriptName(true);

export const listCommand = createBaseCommand(scriptName, "1.0.0", "List recent runs, newest first.")
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.type("output-format", outputFormatType)
	.option("--limit <count:integer>", "How many runs to show.", { default: 20 })
	.option("--model <model:image-model>", "Only show runs that used this model.")
	.option("-f, --format <format:output-format>", "The output format.", { default: OutputFormat.Pretty })
	.action(async ({ format, limit, model }) => {
		const [{ getHistoryStore, log }, { formatHistoryList }] = await Promise.all([
			import("$generation/cli-runner"),
			import("$history/format-history"),
		]);
		const entries = await readAllAsync(getHistoryStore(), (message) => {
			log.warn(message);
		});
		const matching = entries.filter((entry) => model === undefined || entry.model === model);
		const shown = matching.toReversed().slice(0, Math.max(0, limit));
		if (shown.length === 0 && format === OutputFormat.Pretty) {
			log.info("No runs yet.");
			return;
		}
		console.log(formatHistoryList(shown, format));
	});
