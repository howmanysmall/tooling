import { Table } from "@cliffy/table";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { GREEN_CHECK, RED_X } from "$constants/text-icons";
import { formatCost, toDisplayPath } from "$generation/format-result";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import type { GenerationResult } from "$generation/run-generation";

/** How one model's run ended. A failed run may still have saved images. */
export type CompareOutcome =
	| {
			readonly elapsedMs: number;
			readonly error: string;
			readonly model: string;
			readonly result?: GenerationResult | undefined;
			readonly status: "failed";
	  }
	| {
			readonly elapsedMs: number;
			readonly model: string;
			readonly result: GenerationResult;
			readonly status: "ok";
	  };

export interface CompareReport {
	readonly batch: string;
	readonly outcomes: ReadonlyArray<CompareOutcome>;
	readonly prompt: string;
}

function describeImages(result: GenerationResult): string {
	return `${result.returned} ${toPlural(result.returned, "image")}`;
}

function getTotalCost(outcomes: ReadonlyArray<CompareOutcome>): number | undefined {
	let total: number | undefined;
	for (const { result } of outcomes) {
		if (result?.cost !== undefined) total = (total ?? 0) + result.cost;
	}

	return total;
}

/**
 * The stderr line printed as each model finishes.
 *
 * @param outcome - How the model's run ended.
 * @returns Like `✔ model · 1 image · $0.007 · 4.2s` or `✖ model · reason`.
 */
export function formatOutcomeLine(outcome: CompareOutcome): string {
	const seconds = `${(outcome.elapsedMs / 1000).toFixed(1)}s`;

	if (outcome.status === "failed") return `${RED_X} ${outcome.model} · ${outcome.error}`;

	const { result } = outcome;
	return `${GREEN_CHECK} ${outcome.model} · ${describeImages(result)} · ${formatCost(result.cost)} · ${seconds}`;
}

/**
 * The stderr line printed once every model has finished.
 *
 * @param outcomes - Every model's outcome.
 * @returns Like `✔ 2 of 2 models · 3 images · $0.03`.
 */
export function formatCompareSummary(outcomes: ReadonlyArray<CompareOutcome>): string {
	const succeeded = outcomes.filter((outcome) => outcome.status === "ok").length;
	let images = 0;
	for (const { result } of outcomes) images += result?.returned ?? 0;

	const mark = succeeded === outcomes.length ? GREEN_CHECK : RED_X;
	const models = `${succeeded} of ${outcomes.length} ${toPlural(outcomes.length, "model")}`;
	return `${mark} ${models} · ${images} ${toPlural(images, "image")} · ${formatCost(getTotalCost(outcomes))}`;
}

function getPaths(outcome: CompareOutcome, cwd: string): Array<string> {
	return (outcome.result?.images ?? []).flatMap((image) =>
		image.path === undefined ? [] : [toDisplayPath(image.path, cwd)],
	);
}

interface JsonImage {
	readonly mediaType: string;
	readonly path: string;
}

interface JsonOutcome {
	readonly id?: string;
	readonly cost?: number | undefined;
	readonly error?: string;
	readonly images?: ReadonlyArray<JsonImage>;
	readonly model: string;
	readonly requested?: number;
	readonly returned?: number;
	readonly status: CompareOutcome["status"];
}

function toJsonOutcome(outcome: CompareOutcome, cwd: string): JsonOutcome {
	const { result } = outcome;
	const images = (result?.images ?? []).map((image) => ({
		mediaType: image.mediaType,
		path: image.path === undefined ? "-" : toDisplayPath(image.path, cwd),
	}));
	const run =
		result === undefined
			? {}
			: { id: result.id, cost: result.cost, images, requested: result.requested, returned: result.returned };
	const failure = outcome.status === "failed" ? { error: outcome.error } : {};
	return { model: outcome.model, status: outcome.status, ...run, ...failure };
}

/**
 * Formats a finished comparison for stdout, with the models in the order
 * they were given.
 *
 * @param report - The batch, prompt, and every model's outcome.
 * @param outputFormat - The `--format` value.
 * @param cwd - The current working directory, for relative paths.
 * @returns The text to print, or `undefined` when no image was saved.
 */
export function formatCompareResult(
	report: CompareReport,
	outputFormat: OutputFormat,
	cwd: string,
): string | undefined {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified: {
			const results = report.outcomes.map((outcome) => toJsonOutcome(outcome, cwd));
			const summary = { batch: report.batch, cost: getTotalCost(report.outcomes), prompt: report.prompt };
			return formatJson({ ...summary, results }, outputFormat);
		}

		case OutputFormat.Pretty: {
			const paths = report.outcomes.flatMap((outcome) => getPaths(outcome, cwd));
			return paths.length === 0 ? undefined : paths.join("\n");
		}

		case OutputFormat.Table: {
			const rows = report.outcomes.map((outcome) => [
				outcome.model,
				outcome.status,
				String(outcome.result?.returned ?? 0),
				formatCost(outcome.result?.cost),
			]);

			return new Table().header(["Model", "Status", "Images", "Cost"]).body(rows).border().toString();
		}

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}

export interface PlanRow {
	/** The estimate, like `$0.007` or `unknown (from $0.02/MP)`. */
	readonly cost: string;
	/** Images requested from this model. */
	readonly count: number;
	readonly model: string;
}

/**
 * The plan shown before spending: one line per model and a total.
 *
 * @param prompt - The prompt, shortened.
 * @param rows - Each model's image count and estimate.
 * @param total - The total estimate.
 * @returns The note body.
 */
export function formatComparePlan(prompt: string, rows: ReadonlyArray<PlanRow>, total: string): string {
	let width = 5;
	for (const { model } of rows) width = Math.max(width, model.length);

	let images = 0;
	for (const { count } of rows) images += count;

	const lines = rows.map((row) => `${row.model.padEnd(width)}  ${String(row.count).padStart(2)}  ${row.cost}`);
	return [
		`prompt  ${prompt}`,
		"",
		...lines,
		`${"total".padEnd(width)}  ${String(images).padStart(2)}  ${total}`,
	].join("\n");
}

/**
 * Explains a comparison where some models failed.
 *
 * @param outcomes - Every model's outcome.
 * @returns The message for exit 1, or `undefined` when every model succeeded.
 */
export function describeFailures(outcomes: ReadonlyArray<CompareOutcome>): string | undefined {
	const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
	if (failed === 0) return undefined;
	if (failed === outcomes.length) return `All ${failed} models failed.`;

	return `${failed} of ${outcomes.length} models failed; the other models' images were saved.`;
}
