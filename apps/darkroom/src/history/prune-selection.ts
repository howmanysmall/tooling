import { ValidationError } from "@cliffy/command";

import type { HistoryEntry } from "./history-entry";

const DURATION_PATTERN = /^(?<amount>\d+(?:\.\d+)?)\s*(?<unit>[smhdw])$/iu;
const SIZE_PATTERN = /^(?<amount>\d+(?:\.\d+)?)\s*(?<unit>b|kb|mb|gb|tb|kib|mib|gib|tib)?$/iu;

const DURATION_UNITS: ReadonlyMap<string, number> = new Map([
	["d", 86_400_000],
	["h", 3_600_000],
	["m", 60_000],
	["s", 1000],
	["w", 604_800_000],
]);

const SIZE_UNITS: ReadonlyMap<string, number> = new Map([
	["b", 1],
	["gb", 1e9],
	["gib", 1024 ** 3],
	["kb", 1e3],
	["kib", 1024],
	["mb", 1e6],
	["mib", 1024 ** 2],
	["tb", 1e12],
	["tib", 1024 ** 4],
]);

/**
 * Parses a duration such as `30d`, `12h`, or `2w`.
 *
 * @param value - The text.
 * @returns The duration in milliseconds.
 * @throws {ValidationError} When the text is not a duration.
 */
export function parseDuration(value: string): number {
	const match = DURATION_PATTERN.exec(value.trim());
	const unit = DURATION_UNITS.get(match?.groups?.unit?.toLowerCase() ?? "");
	if (match === null || unit === undefined) {
		throw new ValidationError(`"${value}" is not a duration. Use a number and s, m, h, d, or w, like 30d.`);
	}

	return Number(match.groups?.amount) * unit;
}

/**
 * Parses a size such as `500MB` or `2GiB`. KB, MB, GB, and TB are powers of
 * 1000; KiB, MiB, GiB, and TiB are powers of 1024.
 *
 * @param value - The text.
 * @returns The size in bytes.
 * @throws {ValidationError} When the text is not a size.
 */
export function parseSize(value: string): number {
	const match = SIZE_PATTERN.exec(value.trim());
	const unit = SIZE_UNITS.get(match?.groups?.unit?.toLowerCase() ?? "b");
	if (match === null || unit === undefined) {
		throw new ValidationError(`"${value}" is not a size. Use a number and B, KB, MB, GB, or TB, like 2GB.`);
	}

	return Number(match.groups?.amount) * unit;
}

export interface PruneCriteria {
	/** Keep only the newest this many runs. */
	readonly keep?: number | undefined;
	/** Delete the oldest runs until the history fits in this many bytes. */
	readonly maxSize?: number | undefined;
	/** Delete runs older than this many milliseconds. */
	readonly olderThan?: number | undefined;
}

/**
 * Picks the runs to delete. A run is deleted when any criterion selects it.
 *
 * @param entries - Every run, oldest first.
 * @param sizes - Each run's size in bytes.
 * @param criteria - What to delete.
 * @param now - The current time, in Unix milliseconds.
 * @returns The IDs to delete.
 */
export function selectForPrune(
	entries: ReadonlyArray<HistoryEntry>,
	sizes: ReadonlyMap<string, number>,
	criteria: PruneCriteria,
	now: number,
): Set<string> {
	const selected = new Set<string>();
	const newestFirst = entries.toReversed();
	let total = 0;

	for (const [index, entry] of newestFirst.entries()) {
		total += sizes.get(entry.id) ?? 0;
		const isTooOld = criteria.olderThan !== undefined && Date.parse(entry.created) < now - criteria.olderThan;
		const isBeyondKeep = criteria.keep !== undefined && index >= criteria.keep;
		const isOverSize = criteria.maxSize !== undefined && total > criteria.maxSize;
		if (isTooOld || isBeyondKeep || isOverSize) {
			selected.add(entry.id);
		}
	}

	return selected;
}

export interface PruneFlags {
	readonly keep?: number | undefined;
	readonly maxSize?: string | undefined;
	readonly olderThan?: string | undefined;
}

/**
 * Turns `history prune` flags into criteria.
 *
 * @param flags - The parsed flags.
 * @param flags.keep - How many of the newest runs to keep.
 * @param flags.maxSize - A size like `2GB` the history must fit in.
 * @param flags.olderThan - A duration like `30d`; older runs go.
 * @returns The criteria, or `undefined` when no flag was given, which means
 *   only report the history's size.
 * @throws {ValidationError} When a value can't be parsed.
 */
export function toPruneCriteria({ keep, maxSize, olderThan }: PruneFlags): PruneCriteria | undefined {
	if (keep === undefined && maxSize === undefined && olderThan === undefined) return undefined;

	if (keep !== undefined && keep < 0) {
		throw new ValidationError("--keep must be 0 or more.");
	}

	return {
		keep,
		maxSize: maxSize === undefined ? undefined : parseSize(maxSize),
		olderThan: olderThan === undefined ? undefined : parseDuration(olderThan),
	};
}
