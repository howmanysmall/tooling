import { cwd } from "node:process";
import { confirm, note, outro, spinner } from "@clack/prompts";

import { formatResult, formatSummary } from "$generation/format-result";
import { describeProgress } from "$generation/image-stream";
import { previewPrompt } from "$history/format-history";
import { OutputFormat } from "$validators/output-format-type";

import { exitIfCancelled } from "./exit-if-cancelled";

import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";

const LABEL_WIDTH = 13;

/**
 * Describes a prepared request for the confirmation note.
 *
 * @param prepared - The validated request.
 * @param prepared.input - The prompt and references.
 * @param prepared.model - The chosen model.
 * @param prepared.parameters - The validated settings.
 * @param cost - The estimated cost, already formatted.
 * @returns One `label value` line per setting that is set.
 */
export function summarizeRequest({ input, model, parameters }: PreparedGeneration, cost: string): string {
	const rows: Array<readonly [string, number | string | undefined]> = [
		["model", model.id],
		["prompt", previewPrompt(input.prompt, 60)],
		["count", parameters.count],
		["aspect ratio", parameters.aspectRatio],
		["resolution", parameters.resolution],
		["quality", parameters.quality],
		["references", input.references.length === 0 ? undefined : input.references.length],
		["cost", cost],
	];
	return rows
		.flatMap(([label, value]) => (value === undefined ? [] : [`${label.padEnd(LABEL_WIDTH)}${value}`]))
		.join("\n");
}

/**
 * Shows the request with its estimated cost, asks before spending, and then
 * generates with a timer spinner. Used by interactive mode and the history
 * browser's re-run, so a paid request is never one keystroke away.
 *
 * @param prepared - The validated request.
 * @rejects Whatever generation rejects with, after the spinner is ended.
 */
export async function confirmAndGenerateAsync(prepared: PreparedGeneration): Promise<void> {
	const runner = await import("$generation/cli-runner");
	const cost = await runner.describeCostAsync(prepared);
	note(summarizeRequest(prepared, cost), "Request");
	const shouldGenerate = await confirm({ message: "Generate?" });
	exitIfCancelled(shouldGenerate);
	if (!shouldGenerate) {
		outro("Nothing was sent.");
		return;
	}

	const progress = spinner({ indicator: "timer" });
	progress.start("Generating");
	let result: GenerationResult;
	try {
		result = await runner.generateWithInterruptsAsync(prepared, {
			isQuiet: true,
			onProgress(update) {
				progress.message(`Generating · ${describeProgress(update, prepared.parameters.count)}`);
			},
		});
	} catch (error) {
		// End the spinner's line before the error is printed below it.
		progress.error("Failed");
		throw error;
	}
	progress.stop(formatSummary(result));

	const paths = formatResult(result, OutputFormat.Pretty, cwd());
	if (paths !== undefined) note(paths, "Saved");
	outro("Done.");
	runner.throwIfIncomplete(result);
}
