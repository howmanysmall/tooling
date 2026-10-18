import nodePath from "node:path";
import examples from "@pobammer-ts/darkroom/examples/examples.json";

import type { ImageMetadata } from "astro";

/** One model's answer to the example prompt. */
export interface ModelExample {
	/** The image the model made. */
	readonly image: ImageMetadata;
	/** The model's OpenRouter ID, such as `google/gemini-3-pro-image`. */
	readonly model: string;
	/** The company that makes the model, from the first part of its ID. */
	readonly provider: string;
}

/** Each example image by its file name. */
const IMAGES = new Map(
	Object.entries(
		import.meta.glob<ImageMetadata>("$darkroom-examples/*.avif", { eager: true, import: "default" }),
	).map(([path, image]) => [nodePath.basename(path), image]),
);

/** The prompt every example was made from, with `darkroom compare`. */
export const EXAMPLE_PROMPT = examples.prompt;

/**
 * Lists every model's example, sorted by model ID.
 *
 * @returns The examples. A model whose image is missing is left out.
 */
export function getModelExamples(): Array<ModelExample> {
	const found: Array<ModelExample> = [];
	for (const [model, file] of Object.entries(examples.models)) {
		const image = IMAGES.get(file);
		if (image === undefined) continue;

		const [provider = model] = model.split("/", 1);
		found.push({ image, model, provider });
	}
	return found.toSorted((first, second) => first.model.localeCompare(second.model));
}
