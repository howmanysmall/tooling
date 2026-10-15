import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatCost } from "$generation/format-result";
import { previewPrompt } from "$history/format-history";
import { SHORT_ID_LENGTH } from "$history/resolve-run-reference";
import { shortenHomePath } from "$utilities/path-utilities";

import { formatDayLabel } from "./run-list-layout";

import type { HistoryEntry } from "$history/history-entry";
import type { RunRelations } from "$history/resolve-run-reference";

import type { Fact } from "./fact";

const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Drops the provider from a model ID, which the list and the strip have no
 * room for.
 *
 * @param modelId - Like `recraft/recraft-v4.1-flash`.
 * @returns Like `recraft-v4.1-flash`.
 */
export function getModelName(modelId: string): string {
	return modelId.slice(modelId.lastIndexOf("/") + 1);
}

/**
 * The second line of a run in the list.
 *
 * @param entry - A history entry to summarize.
 * @returns Like `recraft-v4.1-flash · 22:28 · $0.007`.
 */
export function describeRunLine(entry: HistoryEntry): string {
	const cost = entry.cost === undefined ? "cost unknown" : formatCost(entry.cost);
	return [getModelName(entry.model), timeFormatter.format(new Date(entry.created)), cost].join(" · ");
}

/**
 * Says when a run was made, relative to today.
 *
 * @param created - When the run was made, as an ISO timestamp.
 * @param now - The current time, for the day name.
 * @returns Like `Today 09:41` or `Mon 12 Oct 22:28`.
 */
export function describeMadeAt(created: string, now: Date): string {
	const date = new Date(created);
	return `${formatDayLabel(date, now)} ${timeFormatter.format(date)}`;
}

function describeSize({ request }: HistoryEntry): string {
	const parts = [request.aspectRatio, request.resolution, request.quality].filter(
		(part): part is string => part !== undefined,
	);
	return parts.length === 0 ? "default" : parts.join(" · ");
}

function describeImages(entry: HistoryEntry): string {
	if (entry.returned === entry.requested) return `${entry.returned} ${toPlural(entry.returned, "image")}`;

	return `${entry.returned} of ${entry.requested}`;
}

/**
 * The headline facts of a run, shown as small labelled columns.
 *
 * @param entry - A history entry to summarize.
 * @param now - The current time, for the day name.
 * @returns Model, time, size, images, and cost.
 */
export function getRunStats(entry: HistoryEntry, now: Date): Array<Fact> {
	return [
		{ label: "model", value: getModelName(entry.model) },
		{ label: "made", value: describeMadeAt(entry.created, now) },
		{ label: "size", value: describeSize(entry) },
		{ label: "images", value: describeImages(entry) },
		{ label: "cost", value: entry.cost === undefined ? "unknown" : formatCost(entry.cost) },
	];
}

function describeRun(entry: HistoryEntry): string {
	return `${entry.id.slice(0, SHORT_ID_LENGTH)} · ${previewPrompt(entry.prompt, 40)}`;
}

/**
 * Where a run's files are and how it relates to other runs. The history's
 * own copies are left out unless the image went to stdout, since then the
 * copy is the only file.
 *
 * @param entry - A history entry whose files to list.
 * @param relations - Its parents and the other runs of its comparison.
 * @param resolve - Turns a stored path into an absolute one.
 * @returns One labelled line each.
 */
export function getRunLinks(
	entry: HistoryEntry,
	relations: RunRelations,
	resolve: (stored: string) => string,
): Array<Fact> {
	const links: Array<Fact> = entry.images.map((image) => ({
		label: "file",
		value: shortenHomePath(image.output === "-" ? resolve(image.stored) : image.output),
	}));

	for (const reference of entry.references) {
		links.push({ label: "reference", value: shortenHomePath(reference.source) });
	}

	for (const parent of relations.parents) {
		links.push({ label: "re-run of", value: describeRun(parent) });
	}

	for (const run of relations.batch) {
		links.push({ label: "compared", value: `${run.id.slice(0, SHORT_ID_LENGTH)} · ${getModelName(run.model)}` });
	}

	links.push({ isQuiet: true, label: "id", value: entry.id });
	return links;
}
