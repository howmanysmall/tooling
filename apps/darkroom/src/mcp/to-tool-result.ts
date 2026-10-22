import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { tool } from "tmcp/utils";

import { CHARGE_NOTE } from "$errors/to-api-error";
import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import type { CallToolResult } from "tmcp";

import type { CompareOutcome } from "$compare/compare-format";
import type { GenerationResult } from "$generation/run-generation";

import type { McpDependencies } from "./mcp-dependencies";

type ToolResult = CallToolResult<undefined>;

/**
 * Runs a tool's work and turns any failure into a tool error, so the model
 * sees the reason and can correct the call instead of getting a protocol
 * error.
 *
 * @param work - The tool's body.
 * @returns Its result, or the error's message as a tool error.
 */
export async function runToolAsync(work: () => Promise<ToolResult>): Promise<ToolResult> {
	try {
		return await work();
	} catch (error) {
		return tool.error(error instanceof Error ? error.message : String(error));
	}
}

// oxlint-disable-next-line small-rules/no-object-parameters -- serializes whatever a tool returns, like formatJson
export function toJsonResult(value: object): ToolResult {
	return tool.text(formatJson(value, OutputFormat.Json));
}

interface RunSummary {
	readonly id: string;
	readonly cost: number | undefined;
	readonly created: string;
	readonly images: ReadonlyArray<{ readonly mediaType: string; readonly path: string }>;
	readonly model: string;
	/** Why the run is incomplete; empty when every image arrived and saved. */
	readonly problems: ReadonlyArray<string>;
	readonly requested: number;
	readonly returned: number;
}

function describeProblems(result: GenerationResult): Array<string> {
	const problems = result.failures.map((failure) => `${failure.message} (saved to ${failure.recoveredPath} instead)`);
	if (result.providerError !== undefined) {
		problems.unshift(`The provider stopped early: ${result.providerError} ${CHARGE_NOTE}`);
	}
	return problems;
}

function describeRun(result: GenerationResult): RunSummary {
	return {
		id: result.id,
		cost: result.cost,
		created: result.created,
		images: result.images.flatMap((image) =>
			image.path === undefined ? [] : [{ mediaType: image.mediaType, path: image.path }],
		),
		model: result.model,
		problems: describeProblems(result),
		requested: result.requested,
		returned: result.returned,
	};
}

async function getPreviewsAsync(
	results: ReadonlyArray<GenerationResult>,
	dependencies: McpDependencies,
): Promise<Array<ToolResult>> {
	const paths = results.flatMap((result) => result.images.flatMap((image) => image.path ?? []));
	const previews = await Promise.all(paths.map(async (path) => dependencies.toPreviewAsync(path)));
	return previews.flatMap((preview) =>
		preview === undefined ? [] : [tool.media("image", preview.data, preview.mediaType)],
	);
}

function describeOutcome(run: RunSummary): string {
	const cost = run.cost === undefined ? "" : ` for $${run.cost.toFixed(3)}`;
	const paths = run.images.map(({ path }) => path).join(", ");
	return `${run.model} made ${run.images.length} ${toPlural(run.images.length, "image")}${cost}, saved to ${paths}. The images are attached below, so the user can already see them in this result; there is no need to open the files.`;
}

/**
 * Describes a finished run: a sentence saying what was made and where it
 * went, its details as JSON, then a preview of each image.
 *
 * An image saved somewhere other than asked is still a success: it exists,
 * and the problems say where it went.
 *
 * @param result - The run.
 * @param warnings - Notes that didn't block the request.
 * @param dependencies - Makes the previews.
 * @returns The tool result; an error result when no image was saved.
 */
export async function toGenerationResultAsync(
	result: GenerationResult,
	warnings: ReadonlyArray<string>,
	dependencies: McpDependencies,
): Promise<ToolResult> {
	const run = describeRun(result);
	const outcome = run.images.length === 0 ? "No image came back." : describeOutcome(run);
	const summary = toJsonResult({ ...run, warnings });
	const previews = await getPreviewsAsync([result], dependencies);
	const mixed = tool.mix([tool.text(outcome), summary, ...previews]);
	return run.images.length === 0 ? { ...mixed, isError: true } : mixed;
}

/**
 * Describes a finished comparison: each model's outcome as JSON, followed by
 * a preview of every image that was saved.
 *
 * @param batch - The comparison's ID.
 * @param directory - The folder holding the images.
 * @param outcomes - Each model's outcome, in the order given.
 * @param dependencies - Makes the previews.
 * @returns The tool result; an error result when any model failed.
 */
export async function toCompareResultAsync(
	batch: string,
	directory: string,
	outcomes: ReadonlyArray<CompareOutcome>,
	dependencies: McpDependencies,
): Promise<ToolResult> {
	const models = outcomes.map((outcome) => ({
		elapsedMs: Math.round(outcome.elapsedMs),
		error: outcome.status === "failed" ? outcome.error : undefined,
		model: outcome.model,
		run: outcome.result === undefined ? undefined : describeRun(outcome.result),
		status: outcome.status,
	}));
	const summary = toJsonResult({ batch, directory, models });
	const results = outcomes.flatMap((outcome) => outcome.result ?? []);
	const previews = await getPreviewsAsync(results, dependencies);
	const mixed = tool.mix([summary, ...previews]);
	return outcomes.some((outcome) => outcome.status === "failed") ? { ...mixed, isError: true } : mixed;
}
