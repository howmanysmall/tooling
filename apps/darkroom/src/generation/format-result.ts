import nodePath from "node:path";
import { Table } from "@cliffy/table";
import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatJson } from "$utilities/output-format-utilities";
import { OutputFormat } from "$validators/output-format-type";

import type { Except } from "type-fest";

import type { GenerationResult, PreparedGeneration } from "./run-generation";

/**
 * Shows a path relative to `cwd` when it is inside it, like `./cat.png`.
 *
 * @param path - An absolute path.
 * @param cwd - The current working directory.
 * @returns `./relative` inside `cwd`, otherwise the absolute path.
 */
export function toDisplayPath(path: string, cwd: string): string {
	const relative = nodePath.relative(cwd, path);
	return relative.startsWith("..") || nodePath.isAbsolute(relative) ? path : `./${relative}`;
}

const costFormatter = new Intl.NumberFormat("en-US", {
	currency: "USD",
	maximumFractionDigits: 4,
	minimumFractionDigits: 2,
	style: "currency",
});

/**
 * Formats a cost in US dollars.
 *
 * @param cost - The cost, if the API reported one.
 * @returns Something like `$0.08`, or `cost unknown`.
 */
export function formatCost(cost: number | undefined): string {
	return cost === undefined ? "cost unknown" : costFormatter.format(cost);
}

/**
 * The stderr line printed after a run, like `2 images · model · $0.08`.
 *
 * @param result - The finished run.
 * @returns The summary, without the check mark.
 */
export function formatSummary(result: GenerationResult): string {
	return `${result.returned} ${toPlural(result.returned, "image")} · ${result.model} · ${formatCost(result.cost)}`;
}

interface JsonImage {
	readonly mediaType: string;
	readonly path: string;
}

interface JsonResult {
	readonly id: string;
	readonly cost?: number | undefined;
	readonly created: string;
	readonly images: ReadonlyArray<JsonImage>;
	readonly model: string;
	readonly prompt: string;
	readonly requested: number;
	readonly returned: number;
}

function toJsonResult(result: GenerationResult, cwd: string): JsonResult {
	return {
		id: result.id,
		cost: result.cost,
		created: result.created,
		images: result.images.map((image) => ({
			mediaType: image.mediaType,
			path: image.path === undefined ? "-" : toDisplayPath(image.path, cwd),
		})),
		model: result.model,
		prompt: result.prompt,
		requested: result.requested,
		returned: result.returned,
	};
}

function formatPaths(result: GenerationResult, cwd: string): string | undefined {
	const paths = result.images.flatMap((image) => (image.path === undefined ? [] : [toDisplayPath(image.path, cwd)]));
	return paths.length === 0 ? undefined : paths.join("\n");
}

function formatTable(result: GenerationResult, cwd: string): string {
	const rows = result.images.map((image) => [toDisplayPath(image.path ?? "-", cwd), image.mediaType]);
	return new Table().header(["Path", "Media type"]).body(rows).border().toString();
}

/**
 * Formats a run for stdout.
 *
 * @param result - The finished run.
 * @param outputFormat - The `--format` value.
 * @param cwd - The current working directory, for relative paths.
 * @returns The text to print, or `undefined` when there is nothing to print
 *   (the image itself went to stdout).
 */
export function formatResult(result: GenerationResult, outputFormat: OutputFormat, cwd: string): string | undefined {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified:
			return formatJson(toJsonResult(result, cwd), outputFormat);

		case OutputFormat.Pretty:
			return formatPaths(result, cwd);

		case OutputFormat.Table:
			return formatTable(result, cwd);

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}

interface ReferenceDescription {
	readonly bytes: number;
	readonly mediaType: string;
	readonly source: string;
}

export type RequestDescription = Except<PreparedGeneration["request"], "inputReferences"> & {
	readonly inputReferences: ReadonlyArray<ReferenceDescription>;
};

/**
 * Describes the request for `--dry-run`, with reference images summarized
 * instead of inlined as base64.
 *
 * @param prepared - The validated request.
 * @returns A JSON-friendly description.
 */
export function describeRequest(prepared: PreparedGeneration): RequestDescription {
	return {
		...prepared.request,
		inputReferences: prepared.input.references.map((reference) => ({
			bytes: reference.bytes.length,
			mediaType: reference.mediaType,
			source: reference.source,
		})),
	};
}
