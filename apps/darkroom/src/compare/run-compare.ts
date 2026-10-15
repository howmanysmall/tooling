import nodePath from "node:path";
import process, { cwd, exit, stderr } from "node:process";
import { confirm, isCancel, note } from "@clack/prompts";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { ApiError } from "$errors/api-error";
import { ExitCode } from "$errors/exit-code";
import { InterruptedError } from "$errors/interrupted-error";
import { describeEstimate, getCostEstimate } from "$generation/cost-estimate";
import { describeRequest, toDisplayPath } from "$generation/format-result";
import { InterruptAction, InterruptGuard } from "$generation/interrupt-guard";
import { formatLocalDate, slugify } from "$generation/output-paths";
import { previewPrompt } from "$history/format-history";
import { createUlid } from "$history/ulid";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import { describeFailures, formatComparePlan, formatCompareResult, formatCompareSummary } from "./compare-format";
import {
	checkModelIds,
	collectPrepared,
	combineInterruptActions,
	describeTotalCost,
	getCompareDirectory,
	getModelFileStem,
} from "./compare-plan";
import { executeCompareAsync } from "./execute-compare";

import type { CostEstimate } from "$generation/cost-estimate";
import type { ReferenceImage } from "$generation/references";
import type { PreparedGeneration } from "$generation/run-generation";
import type { GenerationOptions } from "$generation/validate-request";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { CompareOutcome } from "./compare-format";
import type { CompareRun } from "./execute-compare";

export interface CompareInput {
	readonly format: OutputFormat;
	readonly isDryRun: boolean;
	/** The models, in the order given; results are reported in this order. */
	readonly modelIds: ReadonlyArray<string>;
	/**
	 * The generate options, applied to every model. `output` is the parent
	 * directory.
	 */
	readonly options: GenerationOptions;
	readonly prompt: string;
	readonly references: ReadonlyArray<ReferenceImage>;
	/** `--yes`: spend without asking. */
	readonly skipConfirmation: boolean;
}

interface ModelEstimate {
	readonly estimate?: CostEstimate | undefined;
	readonly text: string;
}

/** Everything known before spending: the validated requests and their costs. */
interface ComparePlan {
	readonly batch: string;
	readonly directory: string;
	readonly estimates: ReadonlyArray<ModelEstimate>;
	readonly prepared: ReadonlyArray<PreparedGeneration>;
	/** The estimated total, like `$0.025` or `≥ $0.007`. */
	readonly total: string;
}

interface ExecutionReport {
	readonly outcomes: Array<CompareOutcome>;
	/** The exit code of the signal that interrupted the run, if one did. */
	readonly signalCode?: ExitCode | undefined;
}

async function prepareAllAsync(
	input: CompareInput,
	batch: string,
	directory: string,
): Promise<Array<PreparedGeneration>> {
	const { prepareForTerminalAsync } = await import("$generation/cli-runner");
	const settled = await Promise.allSettled(
		input.modelIds.map(async (modelId) =>
			prepareForTerminalAsync({
				batch,
				force: false,
				modelId,
				options: { ...input.options, output: `${directory}${nodePath.sep}` },
				outputStem: getModelFileStem(modelId),
				prompt: input.prompt,
				references: input.references,
			}),
		),
	);
	return collectPrepared(settled);
}

async function getEstimatesAsync(prepared: ReadonlyArray<PreparedGeneration>): Promise<Array<ModelEstimate>> {
	const [{ log, toEstimateRequest }, { getModelPricingAsync }] = await Promise.all([
		import("$generation/cli-runner"),
		import("$utilities/model-pricing-utilities"),
	]);
	let pricing: ModelPricing = {};
	try {
		pricing = await getModelPricingAsync(true, (message) => {
			log.debug(message);
		});
	} catch (error) {
		// Without prices every estimate is unknown, which the plan says.
		log.warn(`Could not read prices: ${error instanceof Error ? error.message : String(error)}`);
	}

	return prepared.map((item) => {
		const endpoints = pricing[item.model.id] ?? [];
		const estimate = getCostEstimate(endpoints, toEstimateRequest(item));
		return { estimate, text: describeEstimate(estimate, endpoints) };
	});
}

async function planCompareAsync(input: CompareInput): Promise<ComparePlan> {
	checkModelIds(input.modelIds);
	const now = new Date();
	const folderName = `${formatLocalDate(now)}_${slugify(input.prompt)}`;
	const directory = getCompareDirectory(input.options.output, cwd(), folderName);
	const batch = createUlid(now.getTime());

	const prepared = await prepareAllAsync(input, batch, directory);
	const estimates = await getEstimatesAsync(prepared);
	const total = describeTotalCost(estimates.map(({ estimate }) => estimate));
	return { batch, directory, estimates, prepared, total };
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
	const plan = await planCompareAsync(input);
	if (input.isDryRun) {
		await printDryRunAsync(input, plan);
		return;
	}

	if (!(await shouldSpendAsync(input, plan))) return;

	const { log } = await import("$generation/cli-runner");
	log.start(`Comparing ${plan.prepared.length} models…`);
	finishCompare(input, plan, await executeAllAsync(plan.prepared));
}
