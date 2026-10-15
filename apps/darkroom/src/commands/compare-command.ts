import { stderr, stdin } from "node:process";
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

export const compareCommand = createBaseCommand(
	scriptName,
	"1.0.0",
	renderHighlight(
		"Generate the same prompt with several models at once, into one folder. Shows the estimated cost and asks before spending; `--yes` skips the question. Saved paths go to stdout, progress to stderr.",
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
	.option("-m, --model <model:image-model>", "A model to compare. Repeat for each model; at least two.", {
		collect: true,
	})
	.option("-i, --image <source:file>", "A reference image path or URL, sent to every model. Repeatable.", {
		collect: true,
	})
	.option("-a, --aspect-ratio <ratio:aspect-ratio>", "The aspect ratio, such as 16:9 or auto.")
	.option("-r, --resolution <tier:resolution>", "The resolution tier: 512, 768, 1K, 1.5K, 2K, or 4K.")
	.option("-q, --quality <level:quality>", "The quality: auto, low, medium, high, xhigh, or max.")
	.option("-n, --count <count:integer>", "Images per model, from 1 to 10.", { default: 1 })
	.option("-o, --output <dir:string>", "Where the comparison folder goes.", { default: "." })
	.option("-t, --type <format:image-type>", "The image encoding.")
	.option("--background <mode:background>", "The background: auto, transparent, or opaque.")
	.option("--compression <level:integer>", "jpeg or webp compression, from 0 to 100.")
	.option("--seed <seed:integer>", "A seed, for models that support one.")
	.option("-y, --yes", "Spend without asking. Required when not on a terminal.")
	.option("-f, --format <format:output-format>", "How to print the result metadata.", {
		default: OutputFormat.Pretty,
	})
	.option("--dry-run", "Validate every model and print the requests and estimated costs without sending them.")
	.example(
		"Compare two models",
		"darkroom compare 'a lighthouse at dusk' -m recraft/recraft-v4.1-flash -m openai/gpt-image-1",
	)
	.example("Script it", "darkroom compare 'a cat' -m a/one -m b/two -n 2 --yes --format json | jq '.results[].model'")
	.action(async (flags, positional) => {
		const isTerminal = stdin.isTTY && stderr.isTTY;
		const isDryRun = flags.dryRun === true;
		const skipConfirmation = flags.yes === true;
		const { checkCanSpend } = await import("$compare/compare-plan");
		checkCanSpend({ isDryRun, isTerminal, skipConfirmation });

		const [
			{ readPromptAsync },
			{ loadReferenceAsync },
			{ toGenerationOptions },
			{ runCompareAsync },
			{ chooseModelsAsync },
		] = await Promise.all([
			import("$generation/cli-runner"),
			import("$generation/references"),
			import("$generation/generation-flags"),
			import("$compare/run-compare"),
			import("$compare/pick-models"),
		]);

		// oxlint-disable react-doctor/server-sequential-independent-await -- the prompt and the model picker both ask on the terminal, one after the other
		const prompt = await readPromptAsync(positional, flags.promptFile);
		const modelIds = await chooseModelsAsync(flags.model, isTerminal);
		const references = await Promise.all((flags.image ?? []).map(async (source) => loadReferenceAsync(source)));
		// oxlint-enable react-doctor/server-sequential-independent-await

		await runCompareAsync({
			format: flags.format,
			isDryRun,
			modelIds,
			options: toGenerationOptions({ ...flags, model: undefined }),
			prompt,
			references,
			skipConfirmation,
		});
	});
