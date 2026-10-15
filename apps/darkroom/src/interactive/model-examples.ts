import type { HistoryEntry } from "$history/history-entry";

/** The newest image a model made for you, to show what it does. */
export interface ModelExample {
	/** When the run was made, as an ISO timestamp. */
	readonly created: string;
	readonly prompt: string;
	/** The image's path inside the history store. */
	readonly stored: string;
}

/**
 * Picks each model's newest image from the history.
 *
 * @param entries - Past runs, in any order.
 * @returns The newest run's first image, keyed by model ID.
 */
export function getModelExamples(entries: ReadonlyArray<HistoryEntry>): Map<string, ModelExample> {
	const examples = new Map<string, ModelExample>();
	for (const { created, images, model, prompt } of entries) {
		const [image] = images;
		const current = examples.get(model);
		if (image === undefined || (current !== undefined && current.created >= created)) continue;

		examples.set(model, { created, prompt, stored: image.stored });
	}
	return examples;
}
