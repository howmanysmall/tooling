import { access, readFile } from "node:fs/promises";
import nodePath from "node:path";
import { isReadonlyDictionaryOfStrings, isString } from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

import { ExampleSource } from "./model-examples";

import type { ModelExample } from "./model-examples";

/** The manifest's name inside the examples folder. */
export const EXAMPLES_MANIFEST = "examples.json";

// How far up from this module the package's `examples` folder may be: one
// level from `dist`, two from `src/interactive`.
const MAX_LEVELS_UP = 4;

const isManifest = type({
	/** The image file of each model, keyed by model ID. */
	models: isReadonlyDictionaryOfStrings,
	/** The one prompt every example was made with. */
	prompt: isString,
}).readonly();

/** The examples folder's manifest. */
export type ExamplesManifest = typeof isManifest.infer;

/**
 * Names a model's example file.
 *
 * @param modelId - Like `google/gemini-nano-banana-2.1`.
 * @returns Like `google__gemini-nano-banana-2.1.avif`.
 */
export function toExampleFileName(modelId: string): string {
	return `${modelId.replaceAll("/", "__")}.avif`;
}

/**
 * Turns the manifest into each model's example.
 *
 * @param manifest - What `examples.json` holds.
 * @param manifest.models - Each model's image file.
 * @param manifest.prompt - The prompt every example was made with.
 * @param directory - The folder holding the manifest and images.
 * @returns Each model's example, keyed by model ID.
 */
export function toShippedExamples({ models, prompt }: ExamplesManifest, directory: string): Map<string, ModelExample> {
	return new Map(
		Object.entries(models).map(([model, file]) => [
			model,
			{ path: nodePath.join(directory, file), prompt, source: ExampleSource.Shipped },
		]),
	);
}

async function existsAsync(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function findExamplesDirectoryAsync(): Promise<string | undefined> {
	let directory = import.meta.dirname;
	for (let level = 0; level <= MAX_LEVELS_UP; level += 1) {
		const candidate = nodePath.join(directory, "examples");
		// oxlint-disable-next-line no-await-in-loop -- the nearest folder wins, so look one level at a time
		if (await existsAsync(nodePath.join(candidate, EXAMPLES_MANIFEST))) return candidate;

		directory = nodePath.dirname(directory);
	}
	return undefined;
}

/**
 * Reads the examples shipped with darkroom. They are only a convenience, so
 * a missing or broken manifest gives none instead of failing.
 *
 * @returns Each model's shipped example, keyed by model ID.
 */
export async function readShippedExamplesAsync(): Promise<Map<string, ModelExample>> {
	const directory = await findExamplesDirectoryAsync();
	if (directory === undefined) return new Map();

	try {
		const text = await readFile(nodePath.join(directory, EXAMPLES_MANIFEST), "utf8");
		const manifest = JSON.parse(text);
		return isManifest.allows(manifest) ? toShippedExamples(manifest, directory) : new Map();
	} catch {
		return new Map();
	}
}
