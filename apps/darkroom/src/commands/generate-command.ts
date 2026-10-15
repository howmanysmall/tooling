import { stat } from "node:fs/promises";
import process, { cwd, exit, stderr, stdin, stdout } from "node:process";
import { renderHighlight } from "@howmanysmall/cli-utilities/cliffy-highlight";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { bold, green } from "ansis";
import { consola } from "consola";

import { ApiError } from "$errors/api-error";
import { ConfigurationError } from "$errors/configuration-error";
import { InterruptedError } from "$errors/interrupted-error";
import { InterruptAction, InterruptGuard } from "$generation/interrupt-guard";
import { formatJson } from "$utilities/output-format-utilities";
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

import type { ImageType } from "$generation/media-types";
import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";
import type { GenerationOptions } from "$generation/validate-request";

const scriptName = getScriptName(true);
// Route every level to stderr so stdout only carries the requested output.
const log = consola.create({ stdout: stderr }).withTag(scriptName);

/** The flags `generate` accepts, as cliffy parses them. */
interface GenerateFlags {
	readonly aspectRatio?: string | undefined;
	readonly background?: string | undefined;
	readonly compression?: number | undefined;
	readonly count: number;
	readonly dryRun?: true | undefined;
	readonly force?: true | undefined;
	readonly format: OutputFormat;
	readonly image?: Array<string> | undefined;
	readonly model?: string | undefined;
	readonly output?: string | undefined;
	readonly promptFile?: string | undefined;
	readonly quality?: string | undefined;
	readonly resolution?: string | undefined;
	readonly seed?: number | undefined;
	readonly type?: ImageType | undefined;
}

function toGenerationOptions(flags: GenerateFlags): GenerationOptions {
	return {
		aspectRatio: flags.aspectRatio,
		background: flags.background,
		compression: flags.compression,
		count: flags.count,
		output: flags.output,
		quality: flags.quality,
		resolution: flags.resolution,
		seed: flags.seed,
		type: flags.type,
	};
}

async function readStdinAsync(): Promise<string> {
	const chunks: Array<Buffer> = [];
	for await (const chunk of stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
	return Buffer.concat(chunks).toString("utf8");
}

async function askForPromptAsync(): Promise<string> {
	const { cancel, isCancel, multiline } = await import("@clack/prompts");
	const answer = await multiline({ message: "Prompt", output: stderr });
	if (isCancel(answer)) {
		cancel("Cancelled.");
		throw new InterruptedError("Cancelled.");
	}
	return answer;
}

async function isDirectoryAsync(path: string): Promise<boolean> {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

async function writeStdoutAsync(bytes: Uint8Array): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		stdout.write(bytes, (error) => {
			if (error instanceof Error) reject(error);
			else resolve();
		});
	});
}

async function resolveModelIdAsync(model: string | undefined): Promise<string> {
	if (model !== undefined) return model;
	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	const { DARKROOM_MODEL } = await getEnvironmentAsync();
	if (DARKROOM_MODEL !== undefined) return DARKROOM_MODEL;
	throw new ConfigurationError("No model chosen. Pass --model or set DARKROOM_MODEL.");
}

async function readPromptAsync(flags: GenerateFlags, positional: string | undefined): Promise<string> {
	const { resolvePromptAsync } = await import("$generation/resolve-prompt");
	const canAsk = stdin.isTTY && stderr.isTTY;
	return resolvePromptAsync({
		askAsync: canAsk ? askForPromptAsync : undefined,
		isStdinTty: stdin.isTTY,
		positional,
		promptFile: flags.promptFile,
		readStdinAsync,
	});
}

async function prepareAsync(flags: GenerateFlags, positional: string | undefined): Promise<PreparedGeneration> {
	const [{ loadReferenceAsync }, { prepareGenerationAsync }, { getImageModelsAsync }] = await Promise.all([
		import("$generation/references"),
		import("$generation/run-generation"),
		import("$utilities/image-model-utilities"),
	]);

	// oxlint-disable react-doctor/server-sequential-independent-await -- a missing model or prompt should fail before anything is fetched
	const modelId = await resolveModelIdAsync(flags.model);
	const prompt = await readPromptAsync(flags, positional);
	const [references, models] = await Promise.all([
		Promise.all((flags.image ?? []).map(async (source) => loadReferenceAsync(source))),
		getImageModelsAsync(),
	]);
	// oxlint-enable react-doctor/server-sequential-independent-await

	return prepareGenerationAsync(
		{ force: flags.force === true, modelId, options: toGenerationOptions(flags), prompt, references },
		{ cwd: cwd(), isDirectoryAsync, models, stdoutIsTty: stdout.isTTY },
	);
}

function createInterruptHandler(guard: InterruptGuard): () => void {
	return () => {
		const action = guard.interrupt();
		if (action === InterruptAction.Defer) log.warn("Saving the images first. Press Ctrl-C again to quit now.");
		if (action === InterruptAction.Exit) exit(130);
	};
}

async function generateWithInterruptsAsync(prepared: PreparedGeneration): Promise<GenerationResult> {
	const [{ executeGenerationAsync }, { getOpenRouterAsync }] = await Promise.all([
		import("$generation/run-generation"),
		import("$functions/get-openrouter-async"),
	]);
	const openrouter = await getOpenRouterAsync();
	const guard = new InterruptGuard();
	const onInterrupt = createInterruptHandler(guard);

	process.on("SIGINT", onInterrupt);
	try {
		log.start(`Generating with ${bold.magenta(prepared.model.id)}…`);
		const result = await executeGenerationAsync(prepared, {
			client: openrouter.images,
			guard,
			now: () => new Date(),
			warn(message) {
				log.warn(message);
			},
			writeStdoutAsync,
		});
		if (guard.wasInterrupted) process.exitCode = 130;
		return result;
	} finally {
		process.off("SIGINT", onInterrupt);
	}
}

async function printDryRunAsync(prepared: PreparedGeneration, format: OutputFormat): Promise<void> {
	const { describeRequest } = await import("$generation/format-result");
	const jsonFormat = format === OutputFormat.JsonMinified ? format : OutputFormat.Json;
	console.log(formatJson(describeRequest(prepared), jsonFormat));
	log.info("Dry run: nothing was sent. Estimated cost: unknown.");
}

async function printResultAsync(result: GenerationResult, format: OutputFormat): Promise<void> {
	const { formatResult, formatSummary } = await import("$generation/format-result");
	const output = formatResult(result, format, cwd());
	if (output !== undefined) console.log(output);
	stderr.write(`${green("✔")} ${formatSummary(result)}\n`);

	if (result.failures.length === 0) return;
	const details = result.failures.map((failure) => `${failure.message} (saved to ${failure.recoveredPath})`);
	throw new ApiError(`Some images could not be written where you asked:\n${details.join("\n")}`);
}

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
		const prepared = await prepareAsync(flags, positional);
		for (const warning of prepared.warnings) log.warn(warning);

		if (flags.dryRun === true) {
			await printDryRunAsync(prepared, flags.format);
			return;
		}

		const result = await generateWithInterruptsAsync(prepared);
		await printResultAsync(result, flags.format);
	});
