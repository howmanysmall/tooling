import { HistoryBrowser } from "./history-browser";

import type { ReactNode } from "react";
import type { Except } from "type-fest";

import type { HistoryBrowserProviderProperties } from "./history-browser-provider";

export type HistoryBrowserScreenProperties = Except<HistoryBrowserProviderProperties, "children">;

/**
 * The full-screen history browser: a run list, the selected run's details,
 * and a footer with the keys.
 *
 * @param properties - The runs and what the keys act on.
 * @param properties.entries - Every run, newest first.
 * @param properties.services - Opens, deletes, previews, and re-runs runs.
 * @returns The whole screen, sized to the terminal.
 */
export function HistoryBrowserScreen({ entries, services }: Readonly<HistoryBrowserScreenProperties>): ReactNode {
	return (
		<HistoryBrowser.Provider entries={entries} services={services}>
			<HistoryBrowser.Frame>
				<HistoryBrowser.Header />
				<HistoryBrowser.Panes>
					<HistoryBrowser.RunList />
					<HistoryBrowser.RunDetail />
				</HistoryBrowser.Panes>
				<HistoryBrowser.Footer />
			</HistoryBrowser.Frame>
		</HistoryBrowser.Provider>
	);
}
