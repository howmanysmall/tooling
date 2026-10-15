import { intro } from "@clack/prompts";
import { render } from "ink";

import { mergeRerunOptions } from "$generation/generation-flags";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { OutputFormat } from "$validators/output-format-type";

import { confirmAndGenerateAsync } from "./confirm-and-generate";
import { HistoryBrowser } from "./history-browser";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { BrowserServices } from "./history-browser";

function createServices(store: HistoryStore, requestRerun: (entry: HistoryEntry) => void): BrowserServices {
	return {
		async deleteRunAsync(entry): Promise<void> {
			const { log } = await import("$generation/cli-runner");
			await store.deleteAsync(new Set([entry.id]), (message) => {
				log.warn(message);
			});
		},
		async openRunAsync(entry): Promise<void> {
			const { openFilesAsync } = await import("$history/open-files");
			await openFilesAsync(entry.images.map((image) => store.resolve(image.stored)));
		},
		requestRerun,
		resolve: (stored) => store.resolve(stored),
	};
}

async function rerunAsync(entry: HistoryEntry, store: HistoryStore): Promise<void> {
	const { prepareForTerminalAsync } = await import("$generation/cli-runner");
	intro(`darkroom · re-run ${entry.id}`);
	const prepared = await prepareForTerminalAsync({
		force: false,
		modelId: entry.model,
		options: mergeRerunOptions(entry, { format: OutputFormat.Pretty }),
		parent: entry.id,
		prompt: entry.prompt,
		references: await loadStoredReferencesAsync(entry, store),
	});
	await confirmAndGenerateAsync(prepared);
}

/**
 * Opens the full-screen history browser. Choosing re-run closes it and asks
 * for confirmation with the estimated cost before anything is spent.
 *
 * @rejects When the history can't be read, or the re-run fails.
 */
export async function browseHistoryAsync(): Promise<void> {
	const { getHistoryStore, log } = await import("$generation/cli-runner");
	const store = getHistoryStore();
	const entries = await store.readAllAsync((message) => {
		log.warn(message);
	});

	let rerunTarget: HistoryEntry | undefined;
	const instance = render(
		<HistoryBrowser
			entries={entries.toReversed()}
			services={createServices(store, (entry) => {
				rerunTarget = entry;
			})}
		/>,
		{ alternateScreen: true },
	);
	await instance.waitUntilExit();

	if (rerunTarget !== undefined) await rerunAsync(rerunTarget, store);
}
