import { ValidationError } from "@cliffy/command";

import { formatLocalDate } from "$generation/output-paths";

import type { HistoryEntry } from "./history-entry";

const LAST_PATTERN = /^last(?:~(?<offset>\d+))?$/u;
export const SHORT_ID_LENGTH = 8;

function summarize(entry: HistoryEntry): string {
	const prompt = entry.prompt.length > 40 ? `${entry.prompt.slice(0, 39)}…` : entry.prompt;
	return `${entry.id.slice(0, SHORT_ID_LENGTH)}  ${formatLocalDate(new Date(entry.created))}  ${prompt}`;
}

/**
 * Finds the run a reference points to: a full ULID, a unique prefix of one,
 * `last`, or `last~N` for N runs before the newest.
 *
 * @param entries - Every run, oldest first.
 * @param reference - What the user typed.
 * @returns The matching run.
 * @throws {ValidationError} When nothing matches or a prefix is ambiguous.
 */
export function resolveRunReference(entries: ReadonlyArray<HistoryEntry>, reference: string): HistoryEntry {
	const last = LAST_PATTERN.exec(reference);
	if (last !== null) {
		const offset = Number(last.groups?.offset ?? "0");
		const entry = entries.at(-1 - offset);
		if (entry === undefined) {
			throw new ValidationError(`There is no run ${reference}; the history has ${entries.length}.`);
		}
		return entry;
	}

	const prefix = reference.toUpperCase();
	const matches = entries.filter((entry) => entry.id.startsWith(prefix));
	const [match] = matches;
	if (match === undefined) throw new ValidationError(`No run matches "${reference}".`);
	if (matches.length > 1) {
		const listing = matches.map((entry) => `  ${summarize(entry)}`).join("\n");
		throw new ValidationError(`"${reference}" matches ${matches.length} runs:\n${listing}`);
	}
	return match;
}

/**
 * Follows `parent` links from a run back to the first run in its chain.
 *
 * @param entries - Every run.
 * @param entry - Where to start.
 * @returns The run's ancestors, nearest first. Stops at a missing parent.
 */
export function getParentChain(entries: ReadonlyArray<HistoryEntry>, entry: HistoryEntry): Array<HistoryEntry> {
	const byId = new Map(entries.map((item) => [item.id, item]));
	const chain: Array<HistoryEntry> = [];
	const seen = new Set([entry.id]);
	let parentId = entry.parent;
	while (parentId !== undefined && !seen.has(parentId)) {
		const parent = byId.get(parentId);
		if (parent === undefined) break;
		chain.push(parent);
		seen.add(parentId);
		parentId = parent.parent;
	}
	return chain;
}
