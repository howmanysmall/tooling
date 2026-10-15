import type { ReferenceImage } from "$generation/references";

import type { HistoryEntry } from "./history-entry";
import type { HistoryStore } from "./history-store";

/**
 * Loads a run's reference images from their history copies, so a re-run
 * works after the originals moved. Each keeps its original source for the
 * new entry.
 *
 * @param entry - The run being repeated.
 * @param store - The history store holding the copies.
 * @returns The references, in their original order.
 * @rejects When a stored copy is missing or is not an image.
 */
export async function loadStoredReferencesAsync(
	entry: HistoryEntry,
	store: HistoryStore,
): Promise<Array<ReferenceImage>> {
	const { loadReferenceAsync } = await import("$generation/references");
	return Promise.all(
		entry.references.map(async (reference) => {
			const loaded = await loadReferenceAsync(store.resolve(reference.stored));
			return { ...loaded, source: reference.source };
		}),
	);
}
