import { access } from "node:fs/promises";

import { resolve } from "$history/history-store";

import { TurnPhase } from "./session-state";

import type { Except } from "type-fest";

import type { SavedImage } from "$generation/save-run";
import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { SessionTurn } from "./session-state";

/** A turn rebuilt from the history, before it is numbered. */
export type RestoredTurn = Except<SessionTurn, "id">;

async function existsAsync(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Finds a saved image: where it was written for you while it is still
 * there, or else the history's copy.
 *
 * @param image - The image, as the history recorded it.
 * @param image.mediaType - Its media type, when recorded.
 * @param image.output - Where it was written, or `-` for stdout.
 * @param image.stored - The history's copy.
 * @param store - The history, which holds the copy.
 * @returns The image as a finished turn shows it.
 */
async function findImageAsync(
	{ mediaType, output, stored }: HistoryEntry["images"][number],
	store: HistoryStore,
): Promise<SavedImage> {
	const path = output !== "-" && (await existsAsync(output)) ? output : resolve(store, stored);
	return { mediaType: mediaType ?? "", path };
}

/**
 * Rebuilds a finished turn from a saved run, so a session can be resumed.
 * How long it took isn't recorded, so its summary leaves that out.
 *
 * @param entry - The run.
 * @param store - The history, which holds the run's copies.
 * @returns The turn, as it looked when the run was saved.
 */
export async function restoreTurnAsync(entry: HistoryEntry, store: HistoryStore): Promise<RestoredTurn> {
	const images = await Promise.all(entry.images.map(async (image) => findImageAsync(image, store)));
	const { id, cost, created, model, prompt, requested, returned } = entry;
	return {
		finishedAt: Date.parse(created),
		model,
		phase: TurnPhase.Done,
		prompt,
		requested,
		result: { id, cost, created, failures: [], images, model, prompt, requested, returned },
		warnings: [],
	};
}
