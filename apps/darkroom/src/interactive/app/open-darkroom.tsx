import { stderr, stdin, stdout } from "node:process";
import { render } from "ink";

import { commandName } from "$constants";
import { deleteRunAsync } from "$history/delete-run";
import { readAllAsync, resolve } from "$history/history-store";
import { listSessions } from "$history/session-list";
import { createUlid } from "$history/ulid";
import { NoticeContext } from "$interactive/components/notice-store";
import { MouseRegistryContext } from "$interactive/mouse/mouse-context";
import { createMouseSession } from "$interactive/mouse/mouse-session";
import { readOpenTabsAsync, writeOpenTabsAsync } from "$interactive/session/open-tabs-file";
import { planOpenTabs } from "$interactive/session/plan-open-tabs";
import { numberTurns } from "$interactive/session/session-actions";
import { createSessionServices } from "$interactive/session/session-services";
import { createSession } from "$interactive/session/session-state";
import { createSessionStore } from "$interactive/session/session-store";
import { createSessionTabs, getActiveSession } from "$interactive/session/session-tabs";
import { ModelSort } from "$utilities/model-filters";

import { loadCatalogAsync } from "./app-catalog";
import { DarkroomApp } from "./darkroom-app";
import { formatExitSummary } from "./exit-summary";
import { finishRunningAsync } from "./finish-running";
import { createTerminalPreviewsAsync } from "./terminal-previews";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { GenerateRequest } from "$interactive/generate/generate-screen";
import type { SessionServices } from "$interactive/session/session-services";
import type { SessionTabs } from "$interactive/session/session-tabs";
import type { CellBox } from "$preview/cell-fit";
import type { LoadingPreview } from "$preview/load-preview";
import type { PreviewCache } from "$preview/preview-cache";

import type { ModelSource } from "./app-catalog";
import type { HistoryServices } from "./app-screens";
import type { AppTab } from "./app-tab";

export interface OpenOptions {
	/** Models already loaded and filtered, as `models list` does. */
	readonly models?: ModelSource | undefined;
	/**
	 * The session to resume: `last`, or a prefix of its ID. With `last`
	 * and no sessions yet, a new one starts.
	 */
	readonly resume?: string | undefined;
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

function createHistoryServices(store: HistoryStore, previews?: PreviewCache): HistoryServices {
	return {
		async deleteRunAsync(entry, deletion): Promise<void> {
			const outputs = entry.images.map(({ output }) => output);
			await deleteRunAsync(store, entry.id, outputs, deletion);
		},
		getPreview: (path, box) => previews?.getPreview(path, box),
		async openRunAsync(entry): Promise<void> {
			const { openFilesAsync } = await import("$history/open-files");
			await openFilesAsync(entry.images.map((image) => resolve(store, image.stored)));
		},
		resolve: (stored) => resolve(store, stored),
	};
}

/**
 * Opens the tabs from {@link planOpenTabs}, rebuilding each session's
 * turns. Without a session asked for, a new one opens after the others.
 *
 * @param entries - Every run, newest first.
 * @param resume - `last`, a prefix of a session's ID, or `undefined`.
 * @param services - Rebuilds the sessions' turns.
 * @param store - The history, beside which the open tabs are saved.
 * @returns The tabs to open with.
 * @rejects When no session matches.
 */
async function openTabsAsync(
	entries: ReadonlyArray<HistoryEntry>,
	resume: string | undefined,
	services: SessionServices,
	store: HistoryStore,
): Promise<SessionTabs> {
	const { open } = await readOpenTabsAsync(store);
	const { activeId, toOpen } = planOpenTabs(listSessions(entries), open, resume);
	const restored = await Promise.all(
		toOpen.map(async ({ id, runs }) => createSession(id, numberTurns(await services.restoreAsync(runs)))),
	);

	if (activeId !== undefined) return createSessionTabs(restored, activeId);

	const fresh = createSession(createUlid());
	return createSessionTabs([...restored, fresh], fresh.id);
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
 * @param options.resume - The session to resume, if any.
 * @param options.sort - The order the models tab opens in.
 * @param options.tab - The tab to open on.
 * @rejects When the history can't be read, no session matches, or the
 *   guided session fails.
 */
export async function openDarkroomAsync({ models, resume, sort = ModelSort.Name, tab }: OpenOptions): Promise<void> {
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
	const sessions = createSessionStore(await openTabsAsync(entries, resume, session, store), async (tabs) =>
		writeOpenTabsAsync(store, tabs),
	);
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
					sessions={sessions}
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
	await Promise.all([finishRunningAsync(session), sessions.flushAsync()]);
	const summary = formatExitSummary(getActiveSession(sessions.getTabs()), commandName);
	if (summary !== undefined) stderr.write(`${summary}\n`);

	const guided = getRequest();
	if (guided === undefined) return;

	const { runInteractiveSessionAsync } = await import("$interactive/generate/interactive-session");
	await runInteractiveSessionAsync({
		model: guided.model,
		prompt: guided.prompt.length === 0 ? undefined : guided.prompt,
	});
}
