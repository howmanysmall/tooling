import type { HistoryEntry } from "$history/history-entry";

export const enum ExampleSource {
	/** Shipped with darkroom, made with one shared prompt. */
	Shipped = "shipped",
	/** The newest image you made with the model. */
	Yours = "yours",
}

/** An image that shows what a model does. */
export interface ModelExample {
	/** When you made it, as an ISO timestamp; shipped examples have none. */
	readonly created?: string | undefined;
	/** The image's absolute path. */
	readonly path: string;
	readonly prompt: string;
	readonly source: ExampleSource;
}

/**
 * Picks each model's newest image from the history.
 *
 * @param entries - Past runs, in any order.
 * @param resolve - Turns a stored path into an absolute one.
 * @returns The newest run's first image, keyed by model ID.
 */
export function getModelExamples(
	entries: ReadonlyArray<HistoryEntry>,
	resolve: (stored: string) => string,
): Map<string, ModelExample> {
	const newest = new Map<string, HistoryEntry>();
	for (const entry of entries) {
		const current = newest.get(entry.model);
		if (entry.images.length > 0 && (current === undefined || entry.created > current.created)) {
			newest.set(entry.model, entry);
		}
	}

	const examples = new Map<string, ModelExample>();
	for (const [model, { created, images, prompt }] of newest) {
		const [image] = images;
		if (image !== undefined) {
			examples.set(model, { created, path: resolve(image.stored), prompt, source: ExampleSource.Yours });
		}
	}

	return examples;
}
