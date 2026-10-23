import { cwd } from "node:process";
import { confirm, note, outro, spinner } from "@clack/prompts";

import { formatResult, formatSummary } from "$generation/format-result";
import { describeProgress } from "$generation/image-stream";
import { OutputFormat } from "$validators/output-format-type";

import { exitIfCanceled } from "./exit-if-canceled";
import { summarizeRequest } from "./request-summary";

import type { GenerationResult, PreparedGeneration } from "$generation/run-generation";

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
	exitIfCanceled(shouldGenerate);

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
