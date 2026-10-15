#!/usr/bin/env bun
/**
 * Builds the examples shipped with darkroom from a `darkroom compare` run:
 * each model's image, shrunk to a small AVIF, plus a manifest with the
 * shared prompt. Run it again after comparing new models, as
 * `bun apps/darkroom/scripts/build-examples.ts <compare folder>`.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { argv, exit, stderr } from "node:process";
import sharp from "sharp";

import { environmentPaths } from "$constants/environment-paths";
import { HistoryStore } from "$history/history-store";
import { getModelExamples } from "$interactive/model-examples";
import { EXAMPLES_MANIFEST, toExampleFileName } from "$interactive/shipped-examples";

import type { ExamplesManifest } from "$interactive/shipped-examples";

// The detail pane draws examples at about this size; more is wasted bytes.
const LONG_EDGE = 512;
const QUALITY = 45;
const OUTPUT = nodePath.join(import.meta.dirname, "..", "examples");

const folderArgument = argv.at(2);
if (folderArgument === undefined) {
	stderr.write("Usage: bun run apps/darkroom/scripts/build-examples.ts <compare folder>\n");
	exit(2);
}

const folder = nodePath.resolve(folderArgument) + nodePath.sep;
const store = new HistoryStore(environmentPaths.data);
const entries = await store.readAllAsync((message) => {
	stderr.write(`${message}\n`);
});
// The history knows each image's model and prompt; file names only hint.
const batch = entries.filter((entry) => entry.images.some((image) => image.output.startsWith(folder)));
const examples = getModelExamples(batch, (stored) => store.resolve(stored));

const prompts = new Set(Array.from(examples.values(), (example) => example.prompt));
const [prompt] = prompts;
if (prompt === undefined || prompts.size > 1) {
	stderr.write(`Expected one compare run with one prompt in ${folder}, found ${prompts.size} prompts.\n`);
	exit(1);
}

await rm(OUTPUT, { force: true, recursive: true });
await mkdir(OUTPUT, { recursive: true });

const models: Record<string, string> = {};
let total = 0;
const byModel = [...examples].toSorted(([first], [second]) => first.localeCompare(second));
for (const [model, example] of byModel) {
	const file = toExampleFileName(model);
	// oxlint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- one image at a time keeps memory flat
	const { size } = await sharp(example.path)
		.resize(LONG_EDGE, LONG_EDGE, { fit: "inside" })
		.avif({ effort: 6, quality: QUALITY })
		.toFile(nodePath.join(OUTPUT, file));
	models[model] = file;
	total += size;
}

const manifest: ExamplesManifest = { models, prompt };
await writeFile(nodePath.join(OUTPUT, EXAMPLES_MANIFEST), `${JSON.stringify(manifest, undefined, "\t")}\n`);
stderr.write(`Wrote ${Object.keys(models).length} examples, ${(total / 1024).toFixed(0)} KB, to ${OUTPUT}\n`);
