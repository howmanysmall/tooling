import { env, stdout } from "node:process";
import { intro } from "@clack/prompts";
import { render } from "ink";

import { mergeRerunOptions } from "$generation/generation-flags";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { getImageProtocol } from "$preview/image-protocol";
import { createPreviewCache } from "$preview/preview-cache";
import { OutputFormat } from "$validators/output-format-type";

import { confirmAndGenerateAsync } from "./confirm-and-generate";
import { HistoryBrowser } from "./history-browser";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { TerminalEnvironment } from "$preview/image-protocol";
import type { PreviewCache } from "$preview/preview-cache";

import type { BrowserServices } from "./history-browser";

function pickTerminalVariables({
	COLORTERM,
	KITTY_WINDOW_ID,
	TERM,
	TERM_PROGRAM,
	TMUX,
}: NodeJS.ProcessEnv): TerminalEnvironment {
	return { COLORTERM, KITTY_WINDOW_ID, TERM, TERM_PROGRAM, TMUX };
}

function createServices(
	store: HistoryStore,
	previews: PreviewCache | undefined,
	requestRerun: (entry: HistoryEntry) => void,
): BrowserServices {
	return {
		async deleteRunAsync(entry): Promise<void> {
			const { log } = await import("$generation/cli-runner");
			await store.deleteAsync(new Set([entry.id]), (message) => {
				log.warn(message);
			});
		},
		getPreview: (path, box) => previews?.getPreview(path, box),
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
	const [{ getHistoryStore, log }, { getEnvironmentAsync }] = await Promise.all([
		import("$generation/cli-runner"),
		import("$functions/get-environment-async"),
	]);
	const store = getHistoryStore();
	const [entries, { DARKROOM_PREVIEW }] = await Promise.all([
		store.readAllAsync((message) => {
			log.warn(message);
		}),
		getEnvironmentAsync(),
	]);
	const protocol = getImageProtocol({ ...pickTerminalVariables(env), DARKROOM_PREVIEW });
	const previews = createPreviewCache(protocol, (sequence) => {
		stdout.write(sequence);
	});

	let rerunTarget: HistoryEntry | undefined;
	const instance = render(
		<HistoryBrowser
			entries={entries.toReversed()}
			services={createServices(store, previews, (entry) => {
				rerunTarget = entry;
			})}
		/>,
		{ alternateScreen: true },
	);
	await instance.waitUntilExit();
	previews?.dispose();

	if (rerunTarget !== undefined) await rerunAsync(rerunTarget, store);
}
