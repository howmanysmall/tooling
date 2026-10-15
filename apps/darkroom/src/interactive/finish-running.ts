import process, { cwd, exit } from "node:process";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatSummary, toDisplayPath } from "$generation/format-result";

import type { SessionServices, SettledRun } from "./session-services";

/** One line of the report printed as each late run settles. */
export interface ReportLine {
	readonly level: "error" | "info" | "success";
	readonly text: string;
}

/**
 * Describes a run that settled after the app closed: its summary and where
 * each image was saved, or why it failed.
 *
 * @param run - A request that finished or failed after the app closed.
 * @param run.error - Why it failed, if it did.
 * @param run.prompt - What it was asked to make.
 * @param run.result - What it saved, if it finished.
 * @param directory - The working directory, for shorter paths.
 * @returns A summary and a line per saved image, or the failure.
 */
export function describeSettledRun({ error, prompt, result }: SettledRun, directory: string): Array<ReportLine> {
	if (result === undefined) return [{ level: "error", text: `${prompt}: ${error ?? "failed"}` }];

	const lines: Array<ReportLine> = [{ level: "success", text: formatSummary(result) }];
	for (const { path } of result.images) {
		if (path !== undefined) lines.push({ level: "info", text: toDisplayPath(path, directory) });
	}
	return lines;
}

/**
 * Waits, after the app has closed, for every request that was still
 * generating, so a paid image is never thrown away by quitting. Each one is
 * saved to disk and the history as usual, then reported. The first Ctrl-C
 * only warns; a second quits anyway.
 *
 * @param services - The session's services.
 */
export async function finishRunningAsync(services: SessionServices): Promise<void> {
	const count = services.getRunningCount();
	if (count === 0) return;

	const { log } = await import("$generation/cli-runner");
	log.start(`Finishing ${count} ${toPlural(count, "generation")}. They'll be saved to the history.`);

	let interrupts = 0;
	function onInterrupt(): void {
		interrupts += 1;
		if (interrupts > 1) exit(130);
		log.warn("Still generating. Press Ctrl-C again to quit anyway; the images may be lost.");
	}

	process.on("SIGINT", onInterrupt);
	try {
		const settled = await services.waitForRunningAsync();
		const lines = settled.flatMap((run) => describeSettledRun(run, cwd()));
		for (const { level, text } of lines) log[level](text);
	} finally {
		process.off("SIGINT", onInterrupt);
	}
}
