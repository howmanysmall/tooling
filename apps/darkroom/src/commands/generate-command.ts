import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
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
import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";

const scriptName = getScriptName(true);

export const generateCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight(
		"Generate images with OpenRouter. Saved paths go to stdout; progress and costs go to stderr. Pass `-i` to add reference images.",
	),
)
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
	.arguments("[prompt:string]")
	.option("--prompt-file <path:file>", "Read the prompt from a file.")
	.option("-m, --model <model:image-model>", "The model to use. Defaults to DARKROOM_MODEL.")
	.option("-i, --image <source:file>", "A reference image path or URL. Repeatable.", { collect: true })
	.option("-a, --aspect-ratio <ratio:aspect-ratio>", "The aspect ratio, such as 16:9 or auto.")
	.option("-r, --resolution <tier:resolution>", "The resolution tier: 512, 768, 1K, 1.5K, 2K, or 4K.")
	.option("-q, --quality <level:quality>", "The quality: auto, low, medium, high, xhigh, or max.")
	.option("-n, --count <count:integer>", "How many images to request, from 1 to 10.", { default: 1 })
	.option("-o, --output <path:string>", "A file, a directory ending in /, or - for stdout.")
	.option("-t, --type <format:image-type>", "The image encoding. Inferred from -o when it has an extension.")
	.option("--background <mode:background>", "The background: auto, transparent, or opaque.")
	.option("--compression <level:integer>", "jpeg or webp compression, from 0 to 100.")
	.option("--seed <seed:integer>", "A seed, for models that support one.")
	.option("-f, --format <format:output-format>", "How to print the result metadata.", {
		default: OutputFormat.Pretty,
	})
	.option("--force", "Allow overwriting an explicit -o file.")
	.option("--dry-run", "Validate and print the request without sending it.")
	.action(async (flags, positional) => {
		const [
			{ prepareForTerminalAsync, readPromptAsync, resolveModelIdAsync, runPreparedAsync },
			{ loadReferenceAsync },
			{ toGenerationOptions },
		] = await Promise.all([
			import("$generation/cli-runner"),
			import("$generation/references"),
			import("$generation/generation-flags"),
		]);

		// oxlint-disable react-doctor/server-sequential-independent-await -- a missing model or prompt should fail before anything is fetched
		const modelId = await resolveModelIdAsync(flags.model);
		const prompt = await readPromptAsync(positional, flags.promptFile);
		const references = await Promise.all((flags.image ?? []).map(async (source) => loadReferenceAsync(source)));
		// oxlint-enable react-doctor/server-sequential-independent-await

		const prepared = await prepareForTerminalAsync({
			force: flags.force === true,
			modelId,
			options: toGenerationOptions(flags),
			prompt,
			references,
		});

		await runPreparedAsync(prepared, flags.format, flags.dryRun === true);
	});
