import { Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";
import { HistoryKeyHints } from "./history-key-hints";
import { theme } from "./theme";

import type { ReactNode } from "react";

/**
 * The footer while browsing: the outcome of the last action, or the keys.
 *
 * @returns A coloured status line, or the key hints.
 */
export function HistoryStatusLine(): ReactNode {
	const {
		state: { status },
	} = useHistoryBrowser();
	if (status === undefined) return <HistoryKeyHints />;

	return status.tone === "error" ? (
		<Text color={theme.danger}>{`✖ ${status.text}`}</Text>
	) : (
		<Text color={theme.success}>{`✔ ${status.text}`}</Text>
	);
}
