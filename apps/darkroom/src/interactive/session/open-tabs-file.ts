import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import { type } from "arktype";

import { writeFileAtomicAsync } from "$utilities/atomic-write";

import type { HistoryStore } from "$history/history-store";

const isOpenTabs = type({
	/** The session on screen when the app closed. */
	"active?": "string",
	/** Open sessions, in tab order. */
	open: "string[]",
}).readonly();

/** Which sessions were open as tabs, saved beside the history. */
export type OpenTabs = typeof isOpenTabs.infer;

const NO_TABS: OpenTabs = { open: [] };

function getPath({ root }: HistoryStore): string {
	return nodePath.join(root, "tabs.json");
}

/**
 * Reads which sessions were open when the app last closed.
 *
 * @param store - The history, whose folder holds the file.
 * @returns The open sessions, or none when the file is missing or broken.
 */
export async function readOpenTabsAsync(store: HistoryStore): Promise<OpenTabs> {
	try {
		const text = await readFile(getPath(store), "utf8");
		const parsed = isOpenTabs(JSON.parse(text));
		return parsed instanceof type.errors ? NO_TABS : parsed;
	} catch {
		return NO_TABS;
	}
}

/**
 * Saves which sessions are open, so they open again next time.
 *
 * @param store - The history, whose folder holds the file.
 * @param tabs - The open sessions.
 */
export async function writeOpenTabsAsync(store: HistoryStore, tabs: OpenTabs): Promise<void> {
	await writeFileAtomicAsync(getPath(store), `${JSON.stringify(tabs)}\n`);
}
