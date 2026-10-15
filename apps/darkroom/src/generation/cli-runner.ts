import { stat } from "node:fs/promises";
import process, { cwd, exit, stderr, stdin, stdout } from "node:process";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { bold, green } from "ansis";
import { consola } from "consola";

import { environmentPaths } from "$constants/environment-paths";
import { ApiError } from "$errors/api-error";
import { ConfigurationError } from "$errors/configuration-error";
import { InterruptedError } from "$errors/interrupted-error";
import { HistoryStore } from "$history/history-store";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import { InterruptAction, InterruptGuard } from "./interrupt-guard";

import type { GenerationInput, GenerationResult, PreparedGeneration } from "./run-generation";

// Shared by `generate`, `history rerun`, and interactive mode: everything
// between parsed flags and the generation core that touches the terminal.

const scriptName = getScriptName(true);
// Route every level to stderr so stdout only carries the requested output.
export const log = consola.create({ stdout: stderr }).withTag(scriptName);

export function getHistoryStore(): HistoryStore {
	return new HistoryStore(environmentPaths.data);
}

export async function readStdinAsync(): Promise<string> {
	const chunks: Array<Buffer> = [];
	for await (const chunk of stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
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

/**
 * Picks the model: `--model`, then `DARKROOM_MODEL`.
 *
 * @param model - What `--model` was set to, if anything.
 * @returns The ID of the model to request images from.
 * @rejects A `ConfigurationError` (exit 3) when neither is set.
 */
export async function resolveModelIdAsync(model: string | undefined): Promise<string> {
	if (model !== undefined) return model;
	const { getEnvironmentAsync } = await import("$functions/get-environment-async");
	const { DARKROOM_MODEL } = await getEnvironmentAsync();
	if (DARKROOM_MODEL !== undefined) return DARKROOM_MODEL;
	throw new ConfigurationError("No model chosen. Pass --model or set DARKROOM_MODEL.");
}

/**
 * Validates a generation against the cached model list and the terminal.
 *
 * @param input - What to generate.
 * @returns The prepared request.
 */
export async function prepareForTerminalAsync(input: GenerationInput): Promise<PreparedGeneration> {
	const [{ prepareGenerationAsync }, { getImageModelsAsync }] = await Promise.all([
		import("./run-generation"),
		import("$utilities/image-model-utilities"),
	]);
	const models = await getImageModelsAsync();
	const prepared = await prepareGenerationAsync(input, {
		cwd: cwd(),
		isDirectoryAsync,
		models,
		stdoutIsTty: stdout.isTTY,
	});
	for (const warning of prepared.warnings) log.warn(warning);
	return prepared;
}

function createInterruptHandler(guard: InterruptGuard): () => void {
	return () => {
		const action = guard.interrupt();
		if (action === InterruptAction.Defer) log.warn("Saving the images first. Press Ctrl-C again to quit now.");
		if (action === InterruptAction.Exit) exit(130);
	};
}

/**
 * Sends the request with Ctrl-C handling, saves the images, and records the
 * run in the history.
 *
 * @param prepared - The validated request.
 * @returns The finished run.
 */
export async function generateWithInterruptsAsync(prepared: PreparedGeneration): Promise<GenerationResult> {
	const [{ executeGenerationAsync }, { getOpenRouterAsync }] = await Promise.all([
		import("./run-generation"),
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
			history: getHistoryStore(),
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

export async function printDryRunAsync(prepared: PreparedGeneration, format: OutputFormat): Promise<void> {
	const { describeRequest } = await import("./format-result");
	const jsonFormat = format === OutputFormat.JsonMinified ? format : OutputFormat.Json;
	console.log(formatJson(describeRequest(prepared), jsonFormat));
	log.info("Dry run: nothing was sent. Estimated cost: unknown.");
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
	if (output !== undefined) console.log(output);
	stderr.write(`${green("✔")} ${formatSummary(result)}\n`);

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
