import { Text } from "ink";

import { useHistoryBrowser } from "./history-browser-context";

import type { ReactNode } from "react";

const KEY_HELP = "↑↓ move · / filter · enter open · y copy id · r rerun · d delete · q quit";

/**
 * The footer while browsing: the last status message, or the key bindings.
 *
 * @returns One line of text.
 */
export function HistoryStatusLine(): ReactNode {
	const {
		state: { status },
	} = useHistoryBrowser();

	return status === undefined ? <Text dimColor={true}>{KEY_HELP}</Text> : <Text>{status}</Text>;
}
