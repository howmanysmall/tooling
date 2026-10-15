import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { getHistoryIdsAsync, historyIdType } from "$validators/history-id-type";

const scriptName = getScriptName(true);

export const openCommand = createBaseCommand(scriptName, "1.0.0", "Open a run's images in the system viewer.")
	.type("history-id", historyIdType)
	.complete("history-id", getHistoryIdsAsync)
	.arguments("<run:history-id>")
	.action(async (_, reference) => {
		const [{ getHistoryStore, log }, { resolveRunReference }, { openFilesAsync }] = await Promise.all([
			import("$generation/cli-runner"),
			import("$history/resolve-run-reference"),
			import("$history/open-files"),
		]);
		const store = getHistoryStore();
		const entries = await store.readAllAsync((message) => {
			log.warn(message);
		});
		const entry = resolveRunReference(entries, reference);
		if (entry.images.length === 0) {
			log.warn(`Run ${entry.id} has no images.`);
			return;
		}
		await openFilesAsync(entry.images.map((image) => store.resolve(image.stored)));
	});
