import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { readAllAsync, resolve } from "$history/history-store";
import { getHistoryIdsAsync, historyIdType } from "$validators/history-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";

const scriptName = getScriptName(true);

export const showCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Show everything recorded for a run, including the runs it was re-run from.",
)
	.type("history-id", historyIdType)
	.complete("history-id", getHistoryIdsAsync)
	.type("output-format", outputFormatType)
	.arguments("<run:history-id>")
	.option("-f, --format <format:output-format>", "The output format.", { default: OutputFormat.Pretty })
	.action(async ({ format }, reference) => {
		const [{ getHistoryStore, log }, { formatHistoryEntry }, { getRunRelations, resolveRunReference }] =
			await Promise.all([
				import("$generation/cli-runner"),
				import("$history/format-history"),
				import("$history/resolve-run-reference"),
			]);
		const store = getHistoryStore();
		const entries = await readAllAsync(store, (message) => {
			log.warn(message);
		});
		const entry = resolveRunReference(entries, reference);
		console.log(
			formatHistoryEntry(entry, getRunRelations(entries, entry), format, (stored) => resolve(store, stored)),
		);
	});
