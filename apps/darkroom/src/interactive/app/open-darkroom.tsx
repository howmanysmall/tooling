import { stdin, stdout } from "node:process";
import { render } from "ink";

import { deleteAsync, readAllAsync, resolve } from "$history/history-store";
import { NoticeContext } from "$interactive/components/notice-store";
import { MouseRegistryContext } from "$interactive/mouse/mouse-context";
import { createMouseSession } from "$interactive/mouse/mouse-session";
import { createSessionServices } from "$interactive/session/session-services";
import { ModelSort } from "$utilities/model-filters";

import { loadCatalogAsync } from "./app-catalog";
import { DarkroomApp } from "./darkroom-app";
import { finishRunningAsync } from "./finish-running";
import { createTerminalPreviewsAsync } from "./terminal-previews";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { GenerateRequest } from "$interactive/generate/generate-screen";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";
import type { PreviewCache } from "$preview/preview-cache";

import type { ModelSource } from "./app-catalog";
import type { HistoryServices } from "./app-screens";
import type { AppTab } from "./app-tab";

export interface OpenOptions {
	/** Models already loaded and filtered, as `models list` does. */
	readonly models?: ModelSource | undefined;
	/** The order the models tab opens in. */
	readonly sort?: ModelSort | undefined;
	readonly tab: AppTab;
}

interface GuidedRequest {
	readonly getRequest: () => GenerateRequest | undefined;
	readonly handleGenerateWithOptions: (request: GenerateRequest) => void;
}

function createGuidedRequest(): GuidedRequest {
	let request: GenerateRequest | undefined;
	return {
		getRequest: () => request,
		handleGenerateWithOptions(chosen): void {
			request = chosen;
		},
	};
}

function createHistoryServices(store: HistoryStore, previews: PreviewCache | undefined): HistoryServices {
	return {
		async deleteRunAsync(entry): Promise<void> {
			const { log } = await import("$generation/cli-runner");
			await deleteAsync(store, new Set([entry.id]), (message) => {
				log.warn(message);
			});
		},
		getPreview: (path, box) => previews?.getPreview(path, box),
		async openRunAsync(entry): Promise<void> {
			const { openFilesAsync } = await import("$history/open-files");
			await openFilesAsync(entry.images.map((image) => resolve(store, image.stored)));
		},
		resolve: (stored) => resolve(store, stored),
	};
}

async function readNewestFirstAsync(store: HistoryStore): Promise<ReadonlyArray<HistoryEntry>> {
	// Warnings would tear the full-screen app; a broken line is skipped.
	const entries = await readAllAsync(store, () => undefined);
	return entries.toReversed();
}

/**
 * Opens darkroom's full-screen app on a tab. The history shows at once; the
 * models load behind it. Generating happens inside the app, after a
 * confirmation with the estimated cost, so a paid request is never one
 * keystroke away. Quitting never cancels a sent request: darkroom stays
 * until each one is saved.
 *
 * @param options - The tab to open on, and any models already loaded.
 * @param options.models - Models already loaded and filtered.
 * @param options.sort - The order the models tab opens in.
 * @param options.tab - The tab to open on.
 * @rejects When the history can't be read, or the guided session fails.
 */
export async function openDarkroomAsync({ models, sort = ModelSort.Name, tab }: OpenOptions): Promise<void> {
	const { getHistoryStore, log } = await import("$generation/cli-runner");
	const store = getHistoryStore();
	const [stored, previews] = await Promise.all([
		readAllAsync(store, (message) => {
			log.warn(message);
		}),
		createTerminalPreviewsAsync(),
	]);
	const entries = stored.toReversed();
	const catalog = loadCatalogAsync(entries, (path) => resolve(store, path), models);
	const session = createSessionServices(store);
	const { getRequest, handleGenerateWithOptions } = createGuidedRequest();
	const openedAt = new Date();

	function getPreview(path: string, box: CellBox): LoadingPreview | undefined {
		return previews?.getPreview(path, box);
	}

	async function readHistoryAsync(): Promise<ReadonlyArray<HistoryEntry>> {
		return readNewestFirstAsync(store);
	}

	const mouse = createMouseSession(stdin, stdout);

	const instance = render(
		<MouseRegistryContext value={mouse.registry}>
			<NoticeContext value={mouse.notices}>
				<DarkroomApp
					catalog={catalog}
					entries={entries}
					getPreview={getPreview}
					history={createHistoryServices(store, previews)}
					initialTab={tab}
					now={openedAt}
					readHistoryAsync={readHistoryAsync}
					session={session}
					sort={sort}
					onGenerateWithOptions={handleGenerateWithOptions}
				/>
			</NoticeContext>
		</MouseRegistryContext>,
		// The app decides what ctrl+c does: clear the prompt, or quit.
		{ alternateScreen: true, exitOnCtrlC: false, stdin: mouse.stdin, stdout: mouse.stdout },
	);
	await instance.waitUntilExit();
	mouse.dispose();
	previews?.dispose();
	await finishRunningAsync(session);

	const guided = getRequest();
	if (guided === undefined) return;

	const { runInteractiveSessionAsync } = await import("$interactive/generate/interactive-session");
	await runInteractiveSessionAsync({
		model: guided.model,
		prompt: guided.prompt.length === 0 ? undefined : guided.prompt,
	});
}
