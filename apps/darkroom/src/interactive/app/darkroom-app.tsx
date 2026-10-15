import { useState } from "react";

import { SessionProvider } from "$interactive/session/session-provider";

import { AppScreens } from "./app-screens";
import { runBrowserTask } from "./run-browser-task";

import type { ReactNode } from "react";

import type { HistoryEntry } from "$history/history-entry";
import type { SessionServices } from "$interactive/session/session-services";

import type { AppScreensProperties } from "./app-screens";

export interface DarkroomAppProperties extends AppScreensProperties {
	/** Reads every run again, newest first, after one is saved. */
	readHistoryAsync: () => Promise<ReadonlyArray<HistoryEntry>>;
	/** Prices, confirms, and sends the prompt box's requests. */
	session: SessionServices;
}

/**
 * The full-screen app: generate, history, and models as tabs around one
 * generate session, with the history kept up to date as runs are saved.
 *
 * @param properties - The runs, the session, and what the tabs need.
 * @param properties.catalog - The models and their prices, loading.
 * @param properties.entries - Every run when the app opened, newest first.
 * @param properties.getPreview - Loads image previews.
 * @param properties.history - What the history tab's keys act on.
 * @param properties.initialTab - The tab to open on.
 * @param properties.now - When the app opened.
 * @param properties.onGenerateWithOptions - Opens the guided session.
 * @param properties.readHistoryAsync - Reads every run again.
 * @param properties.session - Sends the session's requests.
 * @param properties.sort - The order the models tab opens in.
 * @returns Every tab around the session.
 */
export function DarkroomApp({
	catalog,
	entries: initialEntries,
	getPreview,
	history,
	initialTab,
	now,
	onGenerateWithOptions,
	readHistoryAsync,
	session,
	sort,
}: Readonly<DarkroomAppProperties>): ReactNode {
	const [entries, setEntries] = useState(initialEntries);

	async function refreshAsync(): Promise<void> {
		setEntries(await readHistoryAsync());
	}

	function handleRunSaved(): void {
		// A history that can't be read again keeps showing what it had.
		runBrowserTask(refreshAsync(), () => undefined);
	}

	return (
		<SessionProvider services={session} onRunSaved={handleRunSaved}>
			<AppScreens
				catalog={catalog}
				entries={entries}
				getPreview={getPreview}
				history={history}
				initialTab={initialTab}
				now={now}
				sort={sort}
				onGenerateWithOptions={onGenerateWithOptions}
			/>
		</SessionProvider>
	);
}
