import { stat } from "node:fs/promises";
import process, { cwd, exit, stderr, stdin, stdout } from "node:process";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { bold, green } from "ansis";
import { consola } from "consola";

import { environmentPaths } from "$constants/environment-paths";
import { ApiError } from "$errors/api-error";
import { ConfigurationError } from "$errors/configuration-error";
import { InterruptedError } from "$errors/interrupted-error";
import { CHARGE_NOTE } from "$errors/to-api-error";
import { createHistoryStore, readAllAsync } from "$history/history-store";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import { InterruptAction, InterruptGuard } from "./interrupt-guard";

import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";

import type { StreamProgress } from "./image-stream";
import type { ObservedPrices } from "./observed-prices";
import type { GenerationInput, GenerationResult, PreparedGeneration } from "./run-generation";

// Shared by `generate`, `history rerun`, and interactive mode: everything
// between parsed flags and the generation core that touches the terminal.

const scriptName = getScriptName(true);

// Route every level to stderr so stdout only carries the requested output.
export const log = consola.create({ stdout: stderr }).withTag(scriptName);

export function getHistoryStore(): HistoryStore {
	return createHistoryStore(environmentPaths.data);
}

/**
 * Reads past runs for extras like estimates and examples, which are only a
 * convenience, so an unreadable history gives none instead of failing.
 *
 * @returns Every past run, or none when the history can't be read.
 */
export async function readHistoryQuietlyAsync(): Promise<ReadonlyArray<HistoryEntry>> {
	try {
		return await readAllAsync(getHistoryStore(), (message) => {
			log.debug(message);
		});
	} catch (error) {
		log.debug(`Could not read the history: ${error instanceof Error ? error.message : String(error)}`);
		return [];
	}
}

/**
 * Reads what each model has cost per image in past runs.
 *
 * @returns The observed prices, keyed by model ID.
 */
export async function readObservedPricesAsync(): Promise<ObservedPrices> {
	const [{ getObservedPrices }, entries] = await Promise.all([
		import("./observed-prices"),
		readHistoryQuietlyAsync(),
	]);

	return getObservedPrices(entries);
}

export async function readStdinAsync(): Promise<string> {
	const chunks: Array<Buffer> = [];
	for await (const chunk of stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
	}

	return Buffer.concat(chunks).toString("utf8");
}

export async function askForPromptAsync(): Promise<string> {
	const { cancel, isCancel, multiline } = await import("@clack/prompts");
	const answer = await multiline({ message: "Prompt", output: stderr });
	if (isCancel(answer)) {
		cancel("Cancelled.");
		throw new InterruptedError("Cancelled.");
	}

	return answer;
}

/**
 * Reads the prompt from the first source that applies: the positional
 * argument (`-` for stdin), `--prompt-file`, piped stdin, or a prompt on the
 * terminal.
 *
 * @param positional - The `[prompt]` argument, if given.
 * @param promptFile - The `--prompt-file` value, if given.
 * @returns The prompt text.
 * @rejects A `ValidationError` when no source applies or two are given.
 */
export async function readPromptAsync(positional?: string, promptFile?: string): Promise<string> {
	const { resolvePromptAsync } = await import("./resolve-prompt");
	const canAsk = stdin.isTTY && stderr.isTTY;
	return resolvePromptAsync({
		askAsync: canAsk ? askForPromptAsync : undefined,
		isStdinTty: stdin.isTTY,
		positional,
		promptFile,
		readStdinAsync,
	});
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
	const { promise, reject, resolve } = Promise.withResolvers<void>();
	stdout.write(bytes, (error) => {
		if (error instanceof Error) {
			reject(error);
		} else {
			resolve();
		}
	});
	await promise;
}

/**
 * Picks the model: `--model`, then `DARKROOM_MODEL`.
 *
 * @param model - What `--model` was set to, if anything.
 * @returns The ID of the model to request images from.
 * @rejects A `ConfigurationError` (exit 3) when neither is set.
 */
export async function resolveModelIdAsync(model?: string): Promise<string> {
	if (model !== undefined) return model;

	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	const { DARKROOM_MODEL } = await getEnvironmentAsync();
	if (DARKROOM_MODEL !== undefined) return DARKROOM_MODEL;

	throw new ConfigurationError("No model chosen. Pass --model or set DARKROOM_MODEL.");
}

/**
 * Validates a generation against the cached model list without printing,
 * for the full-screen app, which shows the warnings itself.
 *
 * @param input - What to generate.
 * @returns The prepared request, with its warnings.
 */
export async function prepareQuietlyAsync(input: GenerationInput): Promise<PreparedGeneration> {
	const [{ prepareGenerationAsync }, { getImageModelsAsync }] = await Promise.all([
		import("./run-generation"),
		import("$utilities/image-model-utilities"),
	]);
	const models = await getImageModelsAsync();
	return prepareGenerationAsync(input, {
		cwd: cwd(),
		isDirectoryAsync,
		models,
		stdoutIsTty: stdout.isTTY,
	});
}

/**
 * Validates a generation against the cached model list and the terminal.
 *
 * @param input - What to generate.
 * @returns The prepared request.
 */
export async function prepareForTerminalAsync(input: GenerationInput): Promise<PreparedGeneration> {
	const prepared = await prepareQuietlyAsync(input);
	for (const warning of prepared.warnings) {
		log.warn(warning);
	}

	return prepared;
}

export interface GenerateOptions {
	/** Skip the "Generating…" line, for callers that draw their own spinner. */
	readonly isQuiet?: boolean | undefined;
	readonly onProgress?: ((progress: StreamProgress) => void) | undefined;
}

function createInterruptHandler(guard: InterruptGuard): () => void {
	return () => {
		const action = guard.interrupt();
		if (action === InterruptAction.Defer) {
			log.warn("Saving the images first. Press Ctrl-C again to quit now.");
		}
		if (action === InterruptAction.Exit) {
			exit(130);
		}
	};
}

/**
 * Sends the request with Ctrl-C handling, saves the images, and records the
 * run in the history.
 *
 * @param prepared - The validated request.
 * @param options - Streaming progress, and whether to announce the request.
 * @returns The finished run.
 */
export async function generateWithInterruptsAsync(
	prepared: PreparedGeneration,
	options: GenerateOptions = {},
): Promise<GenerationResult> {
	const guard = new InterruptGuard();
	const onInterrupt = createInterruptHandler(guard);

	process.on("SIGINT", onInterrupt);

	try {
		if (options.isQuiet !== true) {
			log.start(`Generating with ${bold.magenta(prepared.model.id)}…`);
		}

		const result = await generateQuietlyAsync(prepared, {
			guard,
			onProgress: options.onProgress,
			warn(message) {
				log.warn(message);
			},
		});

		if (guard.wasInterrupted) {
			process.exitCode = 130;
		}
		return result;
	} finally {
		process.off("SIGINT", onInterrupt);
	}
}

/** How the full-screen app runs a generation without touching the terminal. */
export interface QuietGenerateOptions {
	/** Aborts the request; the app's Esc and Ctrl-C go through it. */
	readonly guard: InterruptGuard;
	readonly onProgress?: ((progress: StreamProgress) => void) | undefined;
	readonly warn: (message: string) => void;
}

/**
 * Sends the request, saves the images, and records the run in the history,
 * without printing or handling signals.
 *
 * @param prepared - The validated request.
 * @param options - The interrupt guard, progress, and warnings.
 * @param options.guard - Aborts the request.
 * @param options.onProgress - Receives streaming progress.
 * @param options.warn - Receives warnings instead of the log.
 * @returns The finished run.
 */
export async function generateQuietlyAsync(
	prepared: PreparedGeneration,
	{ guard, onProgress, warn }: QuietGenerateOptions,
): Promise<GenerationResult> {
	const [{ executeGenerationAsync }, { getOpenRouterAsync }] = await Promise.all([
		import("./run-generation"),
		import("$functions/get-openrouter-async"),
	]);
	const openrouter = await getOpenRouterAsync();
	return executeGenerationAsync(prepared, {
		client: openrouter.images,
		guard,
		history: getHistoryStore(),
		now: () => new Date(),
		onProgress,
		warn,
		writeStdoutAsync,
	});
}

/**
 * Estimates a prepared request's cost from the cached prices.
 *
 * @param prepared - The validated request.
 * @param warn - Reports prices that couldn't be read; the log by default.
 * @returns Something like `$0.08`, `≈ $0.08`, or `unknown (from $30/M tok)`.
 */
export async function describeCostAsync(
	prepared: PreparedGeneration,
	warn: (message: string) => void = (message) => {
		log.warn(message);
	},
): Promise<string> {
	const [{ describeEstimate, getCostEstimate, toEstimateRequest }, { getModelPricingAsync }] = await Promise.all([
		import("./cost-estimate"),
		import("$utilities/model-pricing-utilities"),
	]);

	try {
		const [pricing, observed] = await Promise.all([
			getModelPricingAsync(true, (message) => {
				log.debug(message);
			}),
			readObservedPricesAsync(),
		]);
		const endpoints = pricing[prepared.model.id] ?? [];
		const estimate = getCostEstimate(endpoints, toEstimateRequest(prepared), observed.get(prepared.model.id));
		return describeEstimate(estimate, endpoints);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		warn(`Could not read prices: ${message}`);
		return "unknown";
	}
}

export async function printDryRunAsync(prepared: PreparedGeneration, format: OutputFormat): Promise<void> {
	const [{ describeRequest }, cost] = await Promise.all([import("./format-result"), describeCostAsync(prepared)]);
	const jsonFormat = format === OutputFormat.JsonMinified ? format : OutputFormat.Json;
	console.log(formatJson(describeRequest(prepared), jsonFormat));
	log.info(`Dry run: nothing was sent. Estimated cost: ${cost}.`);
}

/**
 * Prints a finished run: data on stdout, the summary on stderr.
 *
 * @param result - The run.
 * @param format - The `--format` value.
 * @rejects An `ApiError` (exit 1) when some images could not be written where
 *   asked, after printing where they were saved instead.
 */
export async function printResultAsync(result: GenerationResult, format: OutputFormat): Promise<void> {
	const { formatResult, formatSummary } = await import("./format-result");
	const output = formatResult(result, format, cwd());
	if (output !== undefined) {
		console.log(output);
	}
	stderr.write(`${green("✔")} ${formatSummary(result)}\n`);

	throwIfIncomplete(result);
}

/**
 * Fails the run, after its images were printed, when the provider stopped
 * early or an image could not be written where asked.
 *
 * @param result - The finished run.
 * @throws {ApiError} Exit 1, saying where the affected images are.
 */
export function throwIfIncomplete(result: GenerationResult): void {
	if (result.providerError !== undefined) {
		throw new ApiError(`The provider stopped early: ${result.providerError} ${CHARGE_NOTE}`);
	}

	if (result.failures.length === 0) return;

	const details = result.failures.map((failure) => `${failure.message} (saved to ${failure.recoveredPath})`);
	throw new ApiError(`Some images could not be written where you asked:\n${details.join("\n")}`);
}

/**
 * Runs a prepared generation end to end, or prints it for `--dry-run`.
 *
 * @param prepared - The validated request.
 * @param format - The `--format` value.
 * @param isDryRun - Whether to stop before sending.
 */
export async function runPreparedAsync(
	prepared: PreparedGeneration,
	format: OutputFormat,
	isDryRun: boolean,
): Promise<void> {
	if (isDryRun) {
		await printDryRunAsync(prepared, format);
		return;
	}

	const result = await generateWithInterruptsAsync(prepared);
	await printResultAsync(result, format);
}
