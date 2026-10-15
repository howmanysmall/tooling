import type { ImageStreamingResponseData } from "@openrouter/sdk/models";

import type { GeneratedImage } from "./save-run";

export interface StreamProgress {
	/** Images finished so far. */
	readonly completed: number;
	/** Partial frames received for the image in progress. */
	readonly partials: number;
	/** The provider's current phase, such as `reasoning` or `draft`. */
	readonly phase?: string | undefined;
}

export interface StreamedImages {
	readonly cost?: number | undefined;
	/** The provider's error, when the stream ended with one. */
	readonly error?: string | undefined;
	readonly images: ReadonlyArray<GeneratedImage>;
}

interface StreamState {
	readonly cost?: number | undefined;
	readonly error?: string | undefined;
	readonly images: ReadonlyArray<GeneratedImage>;
	readonly partials: number;
	readonly phase?: string | undefined;
}

function addCost(total: number | undefined, cost: null | number | undefined): number | undefined {
	return cost === undefined || cost === null ? total : (total ?? 0) + cost;
}

/**
 * Applies one stream event.
 *
 * @param state - Everything collected so far.
 * @param event - The next event.
 * @returns The new state, or `undefined` for events darkroom ignores.
 */
function applyEvent(state: StreamState, event: ImageStreamingResponseData): StreamState | undefined {
	switch (event.type) {
		case "error":
			return { ...state, error: event.error.message };

		case "image_generation.completed": {
			const image = { b64Json: event.b64Json, mediaType: event.mediaType };
			return {
				...state,
				cost: addCost(state.cost, event.usage?.cost),
				images: [...state.images, image],
				partials: 0,
			};
		}

		case "image_generation.partial_image":
			return { ...state, partials: state.partials + 1 };

		case "image_generation.text_chunk":
			return { ...state, phase: event.phase };

		default:
			return undefined;
	}
}

/**
 * Reads a streamed image response. Partial frames only report progress;
 * they are never kept. Completed images and their costs are collected, and
 * an error event ends the stream without discarding images that already
 * finished, since those were paid for.
 *
 * @param events - Events from the SDK's `EventStream`.
 * @param onProgress - Called after every event that changes progress.
 * @returns The finished images, their summed cost, and any error.
 */
export async function consumeImageStreamAsync(
	events: AsyncIterable<ImageStreamingResponseData>,
	onProgress: (progress: StreamProgress) => void,
): Promise<StreamedImages> {
	let state: StreamState = { images: [], partials: 0 };
	for await (const event of events) {
		const next = applyEvent(state, event);
		if (next === undefined) continue;
		state = next;
		if (state.error !== undefined) break;
		onProgress({ completed: state.images.length, partials: state.partials, phase: state.phase });
	}

	const { cost, error, images } = state;
	return error === undefined ? { cost, images } : { cost, error, images };
}

/**
 * Describes progress for a spinner, like `image 2/4 · partial 3`.
 *
 * @param progress - The latest progress.
 * @param requested - How many images were asked for.
 * @returns A short status line.
 */
export function describeProgress(progress: StreamProgress, requested: number): string {
	const current = Math.min(progress.completed + 1, requested);
	const parts = [`image ${current}/${requested}`];
	if (progress.partials > 0) parts.push(`partial ${progress.partials}`);
	else if (progress.phase !== undefined && progress.phase !== "content") parts.push(`${progress.phase}…`);
	return parts.join(" · ");
}
