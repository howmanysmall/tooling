import { Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

/**
 * The title line, with how many runs are shown.
 *
 * @returns `darkroom history · 3 runs`, or `· 1 of 3 runs` while filtered.
 */
export function HistoryBrowserHeader(): ReactNode {
	const { state } = useHistoryBrowser();
	const shown = state.runs.length;
	const counts = state.filter.length === 0 ? `${shown} runs` : `${shown} of ${state.entries.length} runs`;

	return (
		<Text bold={true}>
			{"darkroom history "}
			<Text dimColor={true}>{`· ${counts}`}</Text>
		</Text>
	);
}
