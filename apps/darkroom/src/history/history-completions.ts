import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import { regex } from "arktype";
import { Predicate } from "effect";

import { environmentPaths } from "$constants/environment-paths";
import { formatLocalDate } from "$generation/output-paths";
import { Shell } from "$utilities/completion-context";

// Run IDs are completed on every Tab, so this reads history.jsonl with plain
// JSON.parse and a small guard instead of loading arktype.

export interface RunSummary {
	readonly id: string;
	readonly created: string;
	readonly model: string;
	readonly prompt: string;
}

const SUMMARY_KEYS = ["id", "created", "model", "prompt"] as const;

function isRunSummary(value: unknown): value is RunSummary {
	if (typeof value !== "object" || value === null) return false;
	const fields = new Map(Object.entries(value));
	return SUMMARY_KEYS.every((key) => Predicate.isString(fields.get(key)));
}

function parseSummary(line: string): RunSummary | undefined {
	try {
		const value = JSON.parse(line);
		return isRunSummary(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Reads the runs from `history.jsonl` text, skipping unreadable lines.
 *
 * @param content - The file's contents.
 * @returns The runs, oldest first.
 */
export function parseRunSummaries(content: string): Array<RunSummary> {
	return content.split("\n").flatMap((line) => {
		const summary = parseSummary(line);
		return summary === undefined ? [] : [summary];
	});
}

/**
 * Turns runs into completion values: `last`, then every ID, newest first.
 * Fish shows a description after a tab; other shells would insert it..
 *
 * @param summaries - The runs, oldest first.
 * @param shell - The shell asking.
 * @returns The completion lines.
 */
export function formatRunCompletions(summaries: ReadonlyArray<RunSummary>, shell?: Shell): Array<string> {
	const newestFirst = summaries.toReversed();
	if (shell !== Shell.Fish) {
		return ["last", ...newestFirst.map((summary) => summary.id)];
	}

	return [
		"last\tThe newest run",
		...newestFirst.map((summary) => {
			const prompt = summary.prompt.replaceAll(/\s+/gu, " ");
			const preview = prompt.length > 40 ? `${prompt.slice(0, 39)}…` : prompt;
			return `${summary.id}\t${formatLocalDate(new Date(summary.created))} · ${summary.model} · ${preview}`;
		}),
	];
}

// oxlint-disable-next-line unicorn/prefer-string-raw -- arkregex
const LAST_PATTERN = regex("^last(?:~(?<offset>\\d+))?$", "u");

/**
 * Finds the run a completion argument refers to, without failing.
 *
 * @param summaries - The runs, oldest first.
 * @param reference - A ULID, prefix, `last`, or `last~N`.
 * @returns The run when exactly one matches.
 */
export function findRunSummary(summaries: ReadonlyArray<RunSummary>, reference: string): RunSummary | undefined {
	const last = LAST_PATTERN.exec(reference);
	if (last !== null) return summaries.at(-1 - Number(last.groups.offset ?? "0"));
	const matches = summaries.filter((summary) => summary.id.startsWith(reference.toUpperCase()));
	return matches.length === 1 ? matches[0] : undefined;
}

export async function readRunSummariesAsync(): Promise<Array<RunSummary>> {
	try {
		return parseRunSummaries(await readFile(nodePath.join(environmentPaths.data, "history.jsonl"), "utf8"));
	} catch {
		return [];
	}
}

/**
 * For `history rerun <id> -a <Tab>`: the model of the run being re-run.
 *
 * @param words - The words typed so far.
 * @returns The model, when the run can be found.
 */
export async function getRerunModelAsync(words: ReadonlyArray<string>): Promise<string | undefined> {
	const index = words.indexOf("rerun");
	const reference = index === -1 ? undefined : words[index + 1];
	if (reference === undefined || reference.startsWith("-")) return undefined;

	return findRunSummary(await readRunSummariesAsync(), reference)?.model;
}
