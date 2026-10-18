import { rm } from "node:fs/promises";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { deleteAsync } from "./history-store";

import type { HistoryStore } from "./history-store";

/** What deleting a run takes with it. */
export const enum RunDeletion {
	/** Its images too: the copies stored with it and the ones saved for you. */
	Files = "files",
	/** Its history entry and stored copies; the images saved for you stay. */
	History = "history",
}

/**
 * Deletes a run for good: its line in the history and the copies stored
 * with it, and with {@link RunDeletion.Files}, the images it saved where
 * you asked. An image already gone is skipped.
 *
 * @param historyStore - The history the run is in.
 * @param id - The run's ULID.
 * @param outputs - Where its images were saved for you; `-` is stdout.
 * @param deletion - Whether the saved images go too.
 */
export async function deleteRunAsync(
	historyStore: HistoryStore,
	id: string,
	outputs: ReadonlyArray<string>,
	deletion: RunDeletion,
): Promise<void> {
	// A line that can't be read is kept out, as everywhere in the app.
	await deleteAsync(historyStore, new Set([id]), () => undefined);
	if (deletion === RunDeletion.History) return;
	await Promise.all(outputs.flatMap((output) => (output === "-" ? [] : [rm(output, { force: true })])));
}

function getDeletions(count: number): Array<RunDeletion | undefined> {
	return count === 0 ? [RunDeletion.History, undefined] : [RunDeletion.History, RunDeletion.Files, undefined];
}

/**
 * Lists the answers to "Delete this?" for a run: Yes, then, when it saved
 * images, Yes with them deleted too, and No last.
 *
 * @param count - How many images the run saved for you.
 * @returns The answers, as the dialog shows them.
 */
export function getDeleteChoices(count: number): Array<string> {
	return count === 0 ? ["Yes", "No"] : ["Yes", `Yes, and delete the ${toPlural(count, "file")}`, "No"];
}

/**
 * Says what an answer from {@link getDeleteChoices} deletes.
 *
 * @param count - How many images the run saved for you.
 * @param index - The answer's place in the list.
 * @returns What to delete, or `undefined` for No.
 */
export function getDeletion(count: number, index: number): RunDeletion | undefined {
	return getDeletions(count)[index];
}
