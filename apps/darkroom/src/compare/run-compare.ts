import process, { cwd, exit, stderr } from "node:process";
import { confirm, isCancel, note } from "@clack/prompts";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { ApiError } from "$errors/api-error";
import { ExitCode } from "$errors/exit-code";
import { InterruptedError } from "$errors/interrupted-error";
import { describeRequest, toDisplayPath } from "$generation/format-result";
import { InterruptAction, InterruptGuard } from "$generation/interrupt-guard";
import { previewPrompt } from "$history/format-history";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import { describeFailures, formatComparePlan, formatCompareResult, formatCompareSummary } from "./compare-format";
import { combineInterruptActions } from "./compare-plan";
import { executeCompareAsync } from "./execute-compare";
import { planCompareAsync } from "./plan-compare";

import type { PreparedGeneration } from "$generation/run-generation";

import type { CompareOutcome } from "./compare-format";
import type { CompareRun } from "./execute-compare";
import type { ComparePlan, CompareRequest } from "./plan-compare";

export interface CompareInput extends CompareRequest {
	readonly format: OutputFormat;
	readonly isDryRun: boolean;
	/** `--yes`: spend without asking. */
	readonly skipConfirmation: boolean;
}

interface ExecutionReport {
	readonly outcomes: Array<CompareOutcome>;
	/** The exit code of the signal that interrupted the run, if one did. */
	readonly signalCode?: ExitCode | undefined;
}

async function planForTerminalAsync(input: CompareInput): Promise<ComparePlan> {
	const [{ log, prepareForTerminalAsync, readObservedPricesAsync }, { getModelPricingAsync }] = await Promise.all([
		import("$generation/cli-runner"),
		import("$utilities/model-pricing-utilities"),
	]);

	function warn(message: string): void {
		log.warn(message);
	}

	return planCompareAsync(
		input,
		{ cwd: cwd(), now: () => new Date(), prepare: prepareForTerminalAsync, warn },
		{
			getObservedPricesAsync: readObservedPricesAsync,
			async getPricingAsync() {
				return getModelPricingAsync(true, (message) => {
					log.debug(message);
				});
			},
			warn,
		},
	);
}

async function printDryRunAsync(input: CompareInput, plan: ComparePlan): Promise<void> {
	const { log } = await import("$generation/cli-runner");
	const models = plan.prepared.map((item, index) => ({
		estimate: plan.estimates[index]?.text ?? "unknown",
		model: item.model.id,
		request: describeRequest(item),
	}));
	const jsonFormat = input.format === OutputFormat.JsonMinified ? input.format : OutputFormat.Json;
	const report = { directory: toDisplayPath(plan.directory, cwd()), models, prompt: input.prompt, total: plan.total };
	console.log(formatJson(report, jsonFormat));
	log.info(`Dry run: nothing was sent. Estimated total: ${plan.total}.`);
}

async function confirmSpendAsync(input: CompareInput, plan: ComparePlan): Promise<boolean> {
	const rows = plan.prepared.map((item, index) => ({
		cost: plan.estimates[index]?.text ?? "unknown",
		count: item.parameters.count,
		model: item.model.id,
	}));
	let images = 0;
	for (const { count } of rows) images += count;

	note(formatComparePlan(previewPrompt(input.prompt, 60), rows, plan.total), "Compare", { output: stderr });

	const answer = await confirm({
		initialValue: false,
		message: `Generate ${images} ${toPlural(images, "image")} for ${plan.total}?`,
		output: stderr,
	});

	if (isCancel(answer)) throw new InterruptedError("Cancelled.");

	return answer;
}

async function shouldSpendAsync(input: CompareInput, plan: ComparePlan): Promise<boolean> {
	if (input.skipConfirmation) return true;

	const isConfirmed = await confirmSpendAsync(input, plan);
	if (!isConfirmed) {
		const { log } = await import("$generation/cli-runner");
		log.info("Nothing was sent.");
	}

	return isConfirmed;
}

async function executeAllAsync(prepared: ReadonlyArray<PreparedGeneration>): Promise<ExecutionReport> {
	const [{ getHistoryStore, log }, { getOpenRouterAsync }] = await Promise.all([
		import("$generation/cli-runner"),
		import("$functions/get-openrouter-async"),
	]);
	const openrouter = await getOpenRouterAsync();
	const runs: Array<CompareRun> = prepared.map((item) => ({ guard: new InterruptGuard(), prepared: item }));
	let signalCode: ExitCode | undefined;

	/**
	 * One handler for every run: in-flight requests are aborted, images that
	 * already arrived finish saving, and a second signal exits immediately.
	 *
	 * @param code - The exit code for this signal.
	 * @returns The handler to register.
	 */
	function createSignalHandler(code: ExitCode): () => void {
		return () => {
			signalCode = code;
			const action = combineInterruptActions(runs.map(({ guard }) => guard.interrupt()));
			if (action === InterruptAction.Defer) {
				log.warn("Saving the images that arrived. Press Ctrl-C again to quit now.");
			}

			if (action === InterruptAction.Exit) exit(code);
		};
	}

	const onInterrupt = createSignalHandler(ExitCode.Interrupted);
	const onTerminate = createSignalHandler(ExitCode.Terminated);
	process.on("SIGINT", onInterrupt);
	process.on("SIGTERM", onTerminate);

	try {
		const outcomes = await executeCompareAsync(runs, {
			client: openrouter.images,
			history: getHistoryStore(),
			now: () => new Date(),
			warn(message) {
				log.warn(message);
			},
		});

		return { outcomes, signalCode };
	} finally {
		process.off("SIGINT", onInterrupt);
		process.off("SIGTERM", onTerminate);
	}
}

function finishCompare(input: CompareInput, plan: ComparePlan, { outcomes, signalCode }: ExecutionReport): void {
	const output = formatCompareResult({ batch: plan.batch, outcomes, prompt: input.prompt }, input.format, cwd());
	if (output !== undefined) console.log(output);
	stderr.write(`${formatCompareSummary(outcomes)}\n`);

	if (signalCode !== undefined) {
		process.exitCode = signalCode;
		return;
	}

	const failure = describeFailures(outcomes);
	if (failure !== undefined) throw new ApiError(failure);
}

/**
 * Generates one prompt with several models at once: validates every model,
 * shows the estimated cost and asks (unless `--yes`), runs the requests in
 * parallel, and saves everything into one folder.
 *
 * @param input - The prompt, models, options, and output choices.
 * @rejects A `ValidationError` (exit 2) before anything is spent, or an
 *   `ApiError` (exit 1) after printing when any model failed.
 */
export async function runCompareAsync(input: CompareInput): Promise<void> {
	const plan = await planForTerminalAsync(input);
	if (input.isDryRun) {
		await printDryRunAsync(input, plan);
		return;
	}

	if (!(await shouldSpendAsync(input, plan))) return;

	const { log } = await import("$generation/cli-runner");
	log.start(`Comparing ${plan.prepared.length} models…`);
	finishCompare(input, plan, await executeAllAsync(plan.prepared));
}
