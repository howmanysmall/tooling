import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { aspectRatioType, getAspectRatiosAsync } from "$validators/aspect-ratio-type";
import {
	backgroundType,
	getBackgroundsAsync,
	getImageTypesAsync,
	getQualitiesAsync,
	getResolutionsAsync,
	imageTypeType,
	qualityType,
	resolutionType,
} from "$validators/generation-parameter-types";
import { getHistoryIdsAsync, historyIdType } from "$validators/history-id-type";
import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";

import type { GenerationFlags } from "$generation/generation-flags";
import type { ReferenceImage } from "$generation/references";
import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

const scriptName = getScriptName(true);

async function loadReferencesAsync(
	entry: HistoryEntry,
	store: HistoryStore,
	sources: ReadonlyArray<string> | undefined,
): Promise<Array<ReferenceImage>> {
	const { loadReferenceAsync } = await import("$generation/references");
	if (sources !== undefined) return Promise.all(sources.map(async (source) => loadReferenceAsync(source)));

	// Use the stored copies, so a re-run works after the originals moved.
	return Promise.all(
		entry.references.map(async (reference) => {
			const loaded = await loadReferenceAsync(store.resolve(reference.stored));
			return { ...loaded, source: reference.source };
		}),
	);
}

async function rerunAsync(flags: GenerationFlags, reference: string): Promise<void> {
	const [
		{ getHistoryStore, log, prepareForTerminalAsync, runPreparedAsync },
		{ mergeRerunOptions },
		{ resolveRunReference },
	] = await Promise.all([
		import("$generation/cli-runner"),
		import("$generation/generation-flags"),
		import("$history/resolve-run-reference"),
	]);
	const store = getHistoryStore();
	const entries = await store.readAllAsync((message) => {
		log.warn(message);
	});
	const entry = resolveRunReference(entries, reference);
	const references = await loadReferencesAsync(entry, store, flags.image);

	const prepared = await prepareForTerminalAsync({
		force: flags.force === true,
		modelId: flags.model ?? entry.model,
		options: mergeRerunOptions(entry, flags),
		parent: entry.id,
		prompt: entry.prompt,
		references,
	});
	await runPreparedAsync(prepared, flags.format, flags.dryRun === true);
}

export const rerunCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	"Repeat a run with its stored prompt, settings, and reference images. Any generate flag overrides the stored value.",
)
	.type("history-id", historyIdType)
	.complete("history-id", getHistoryIdsAsync)
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.type("aspect-ratio", aspectRatioType)
	.complete("aspect-ratio", getAspectRatiosAsync)
	.type("background", backgroundType)
	.complete("background", getBackgroundsAsync)
	.type("quality", qualityType)
	.complete("quality", getQualitiesAsync)
	.type("resolution", resolutionType)
	.complete("resolution", getResolutionsAsync)
	.type("image-type", imageTypeType)
	.complete("image-type", getImageTypesAsync, { override: true })
	.type("output-format", outputFormatType)
	.arguments("<run:history-id>")
	.option("-m, --model <model:image-model>", "Use a different model.")
	.option("-i, --image <source:file>", "Replace the stored reference images. Repeatable.", { collect: true })
	.option("-a, --aspect-ratio <ratio:aspect-ratio>", "Override the aspect ratio.")
	.option("-r, --resolution <tier:resolution>", "Override the resolution tier.")
	.option("-q, --quality <level:quality>", "Override the quality.")
	.option("-n, --count <count:integer>", "Override how many images to request.")
	.option("-o, --output <path:string>", "A file, a directory ending in /, or - for stdout.")
	.option("-t, --type <format:image-type>", "Override the image encoding.")
	.option("--background <mode:background>", "Override the background.")
	.option("--compression <level:integer>", "Override the jpeg or webp compression.")
	.option("--seed <seed:integer>", "Override the seed.")
	.option("-f, --format <format:output-format>", "How to print the result metadata.", {
		default: OutputFormat.Pretty,
	})
	.option("--force", "Allow overwriting an explicit -o file.")
	.option("--dry-run", "Validate and print the request without sending it.")
	.action(async (flags, reference) => rerunAsync(flags, reference));
