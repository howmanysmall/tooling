import { intro } from "@clack/prompts";
import { render } from "ink";

import { mergeRerunOptions } from "$generation/generation-flags";
import { loadStoredReferencesAsync } from "$history/stored-references";
import { ModelSort } from "$utilities/model-filters";
import { OutputFormat } from "$validators/output-format-type";

import { loadCatalogAsync } from "./app-catalog";
import { confirmAndGenerateAsync } from "./confirm-and-generate";
import { DarkroomApp } from "./darkroom-app";
import { createTerminalPreviewsAsync } from "./terminal-previews";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";
import type { PreviewCache } from "$preview/preview-cache";

import type { ModelSource } from "./app-catalog";
import type { AppTab } from "./app-tab";
import type { GenerateRequest } from "./generate-screen";
import type { BrowserServices } from "./history-browser-services";

export interface OpenOptions {
	/** Models already loaded and filtered, as `models list` does. */
	readonly models?: ModelSource | undefined;
	/** The order the models tab opens in. */
	readonly sort?: ModelSort | undefined;
	readonly tab: AppTab;
}

/** What the app was closed to do, if anything. */
type AppOutcome =
	| { readonly entry: HistoryEntry; readonly type: "rerun" }
	| { readonly request: GenerateRequest; readonly type: "generate"; readonly withOptions: boolean };

interface OutcomeRecorder {
	readonly getOutcome: () => AppOutcome | undefined;
	readonly handleGenerate: (request: GenerateRequest, withOptions: boolean) => void;
	readonly handleRerun: (entry: HistoryEntry) => void;
}

function createOutcomeRecorder(): OutcomeRecorder {
	let outcome: AppOutcome | undefined;
	return {
		getOutcome: () => outcome,
		handleGenerate(request, withOptions): void {
			outcome = { request, type: "generate", withOptions };
		},
		handleRerun(entry): void {
			outcome = { entry, type: "rerun" };
		},
	};
}

function createHistoryServices(
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

async function generateAsync({ model, prompt }: GenerateRequest, withOptions: boolean): Promise<void> {
	if (withOptions) {
		const { runInteractiveSessionAsync } = await import("./interactive-session");
		await runInteractiveSessionAsync({ model, prompt: prompt === "" ? undefined : prompt });
		return;
	}

	const { prepareForTerminalAsync } = await import("$generation/cli-runner");
	intro("darkroom");
	const prepared = await prepareForTerminalAsync({
		force: false,
		modelId: model.id,
		options: {},
		prompt,
		references: [],
	});
	await confirmAndGenerateAsync(prepared);
}

async function finishAsync(outcome: AppOutcome, store: HistoryStore): Promise<void> {
	await (outcome.type === "rerun"
		? rerunAsync(outcome.entry, store)
		: generateAsync(outcome.request, outcome.withOptions));
}

/**
 * Opens darkroom's full-screen app on a tab. The history shows at once; the
 * models load behind it. Generating or re-running closes the app and asks
 * before spending, with the estimated cost, so a paid request is never one
 * keystroke away.
 *
 * @param options - The tab to open on, and any models already loaded.
 * @param options.models - Models already loaded and filtered.
 * @param options.sort - The order the models tab opens in.
 * @param options.tab - The tab to open on.
 * @rejects When the history can't be read, or generating fails.
 */
export async function openDarkroomAsync({ models, sort = ModelSort.Name, tab }: OpenOptions): Promise<void> {
	const { getHistoryStore, log } = await import("$generation/cli-runner");
	const store = getHistoryStore();
	const [stored, previews] = await Promise.all([
		store.readAllAsync((message) => {
			log.warn(message);
		}),
		createTerminalPreviewsAsync(),
	]);
	const entries = stored.toReversed();
	const catalog = loadCatalogAsync(entries, (path) => store.resolve(path), models);
	const { getOutcome, handleGenerate, handleRerun } = createOutcomeRecorder();
	const openedAt = new Date();

	function getPreview(path: string, box: CellBox): LoadingPreview | undefined {
		return previews?.getPreview(path, box);
	}

	const instance = render(
		<DarkroomApp
			catalog={catalog}
			entries={entries}
			getPreview={getPreview}
			history={createHistoryServices(store, previews, handleRerun)}
			initialTab={tab}
			now={openedAt}
			sort={sort}
			onGenerate={handleGenerate}
		/>,
		{ alternateScreen: true },
	);
	await instance.waitUntilExit();
	previews?.dispose();

	const outcome = getOutcome();
	if (outcome !== undefined) await finishAsync(outcome, store);
}
