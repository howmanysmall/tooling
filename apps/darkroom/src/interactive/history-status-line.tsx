import { useHistoryBrowser } from "./history-browser-context";
import { KeyHints } from "./key-hints";
import { StatusText } from "./status-text";

import type { ReactNode } from "react";

import type { KeyHint } from "./key-hints";

const KEY_HINTS: ReadonlyArray<KeyHint> = [
	["↑↓", "move"],
	["/", "filter"],
	["⏎", "open"],
	["y", "copy id"],
	["r", "re-run"],
	["d", "delete"],
	["q", "quit"],
];

/**
 * The footer while browsing: the outcome of the last action, or the keys.
 *
 * @returns A coloured status line, or the key hints.
 */
export function HistoryStatusLine(): ReactNode {
	const {
		state: { status },
	} = useHistoryBrowser();

	return status === undefined ? <KeyHints hints={KEY_HINTS} /> : <StatusText status={status} />;
}
