import { Table } from "@cliffy/table";
import { formatArrayAsEnglishList } from "@howmanysmall/english-utilities/format-array-as-english-list";
import { dim } from "ansis";

import { formatCost } from "$generation/format-result";
import { formatLocalDate } from "$generation/output-paths";
import { formatJson, getLabelWidth, renderRows, trimTrailingSpaces } from "$utilities/output-format-utilities";
import { removeControlCharacters } from "$utilities/text-utilities";
import { OutputFormat } from "$validators/output-format-type";

import { SHORT_ID_LENGTH } from "./resolve-run-reference";

import type { Row } from "$utilities/output-format-utilities";

import type { HistoryEntry } from "./history-entry";
import type { RunRelations } from "./resolve-run-reference";

const PROMPT_PREVIEW_LENGTH = 48;

/**
 * Formats an ISO instant as local `YYYY-MM-DD HH:MM`.
 *
 * @param iso - An ISO 8601 instant.
 * @returns The local date and time.
 */
export function formatLocalDateTime(iso: string): string {
	const date = new Date(iso);
	const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
	return `${formatLocalDate(date)} ${time}`;
}

export function previewPrompt(prompt: string, length = PROMPT_PREVIEW_LENGTH): string {
	const singleLine = removeControlCharacters(prompt).replaceAll(/\s+/gu, " ");
	return singleLine.length > length ? `${singleLine.slice(0, length - 1)}…` : singleLine;
}

function toListRow(entry: HistoryEntry): Array<string> {
	return [
		entry.id.slice(0, SHORT_ID_LENGTH),
		formatLocalDateTime(entry.created),
		entry.model,
		entry.cost === undefined ? "?" : formatCost(entry.cost),
		previewPrompt(entry.prompt),
	];
}

/**
 * Formats runs for `history list`, newest first.
 *
 * @param entries - The runs to show, newest first.
 * @param outputFormat - The `--format` value.
 * @returns The text to print.
 */
export function formatHistoryList(entries: ReadonlyArray<HistoryEntry>, outputFormat: OutputFormat): string {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified:
			return formatJson(entries, outputFormat);

		case OutputFormat.Pretty:
			// oxlint-disable-next-line unicorn/no-array-callback-reference -- single parameter function
			return trimTrailingSpaces(new Table().body(entries.map(toListRow)).padding(2).toString());

		case OutputFormat.Table: {
			return (
				new Table()
					.header(["ID", "Date", "Model", "Cost", "Prompt"])
					// oxlint-disable-next-line unicorn/no-array-callback-reference -- single parameter function
					.body(entries.map(toListRow))
					.border()
					.toString()
			);
		}

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}

function describeRequest({ request }: HistoryEntry): Array<Row> {
	const rows: Array<Row> = [["count", String(request.n)]];
	const optional: Array<[string, number | string | undefined]> = [
		["aspect ratio", request.aspectRatio],
		["resolution", request.resolution],
		["quality", request.quality],
		["background", request.background],
		["type", request.outputFormat],
		["compression", request.outputCompression],
		["seed", request.seed],
	];

	for (const [label, value] of optional) if (value !== undefined) rows.push([label, String(value)]);

	return rows;
}

function describeCopy(original: string, copy: string): string {
	const location = dim(`(${copy})`);
	return `${original} ${location}`;
}

export function toShowRows(
	entry: HistoryEntry,
	{ batch, parents }: RunRelations,
	resolve: (stored: string) => string,
): Array<Row> {
	const rows: Array<Row> = [
		["id", entry.id],
		["created", formatLocalDateTime(entry.created)],
		["model", entry.model],
		["prompt", entry.prompt],
		...describeRequest(entry),
		["returned", `${entry.returned} of ${entry.requested}`],
		["cost", entry.cost === undefined ? "unknown" : formatCost(entry.cost)],
	];

	if (parents.length > 0) {
		rows.push(["parents", parents.map((parent) => parent.id.slice(0, SHORT_ID_LENGTH)).join(" ← ")]);
	}

	if (entry.batch !== undefined && batch.length > 0) {
		const others = batch.map((run) => `${run.id.slice(0, SHORT_ID_LENGTH)} ${run.model}`);
		rows.push(["batch", `${entry.batch.slice(0, SHORT_ID_LENGTH)} · with ${formatArrayAsEnglishList(others)}`]);
	}

	for (const reference of entry.references) {
		rows.push(["reference", describeCopy(reference.source, resolve(reference.stored))]);
	}

	for (const image of entry.images) {
		rows.push(["image", describeCopy(image.output, resolve(image.stored))]);
	}

	return rows;
}

/**
 * Formats one run for `history show`.
 *
 * @param entry - The run.
 * @param relations - Its parents and the other runs of its comparison.
 * @param outputFormat - The `--format` value.
 * @param resolve - Turns a stored path into an absolute one.
 * @returns The text to print.
 */
export function formatHistoryEntry(
	entry: HistoryEntry,
	relations: RunRelations,
	outputFormat: OutputFormat,
	resolve: (stored: string) => string,
): string {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified: {
			return formatJson(
				{
					...entry,
					batchRuns: relations.batch.map((run) => run.id),
					parents: relations.parents.map((parent) => parent.id),
				},
				outputFormat,
			);
		}

		case OutputFormat.Pretty: {
			const rows = toShowRows(entry, relations, resolve);
			return renderRows(rows, getLabelWidth(rows), 100);
		}

		case OutputFormat.Table: {
			return new Table()
				.body(toShowRows(entry, relations, resolve).map(([label, value]) => [dim(label), value]))
				.border()
				.toString();
		}

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}
