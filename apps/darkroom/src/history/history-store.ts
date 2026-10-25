import { appendFile, mkdir, open, readdir, readFile, rm, stat } from "node:fs/promises";
import nodePath from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { type } from "arktype";

import { writeFileAtomicAsync } from "$utilities/atomic-write";
import { getErrorCode } from "$utilities/error-utilities";

import { isHistoryEntry } from "./history-entry";

import type { HistoryEntry } from "./history-entry";

const HISTORY_FILE = "history.jsonl";
const IMAGES_DIRECTORY = "images";
const LOCK_FILE = "history.lock";
const LOCK_RETRY_MS = 50;
const LOCK_TIMEOUT_MS = 10_000;

/** A lock older than this was left by a crashed process. */
const STALE_LOCK_MS = 60_000;

export interface StoredFile {
	readonly bytes: Uint8Array;
	/** The extension, without a dot. */
	readonly extension: string;
}

/**
 * The run history: `history.jsonl` plus copies of every image and reference
 * under `images/<id>/`. Paths stored in entries are relative to `root`.
 */
export interface HistoryStore {
	readonly root: string;
}

export function createHistoryStore(root: string): HistoryStore {
	return { root };
}

/**
 * Gets the folder holding a run's image copies.
 *
 * @param historyStore - The {@linkcode HistoryStore} to use.
 * @param historyStore.root - The root folder of the history store.
 * @param id - The run's ULID.
 * @returns The absolute path.
 */
export function getRunDirectory({ root }: HistoryStore, id: string): string {
	return nodePath.join(root, IMAGES_DIRECTORY, id);
}

/**
 * Measures how much space a run's copies take.
 *
 * @param historyStore - The {@linkcode HistoryStore} to use.
 * @param id - The run's ULID.
 * @returns The total size in bytes, or 0 when the folder is missing.
 */
export async function getRunSizeAsync(historyStore: HistoryStore, id: string): Promise<number> {
	return getDirectorySizeAsync(getRunDirectory(historyStore, id));
}

/**
 * Adds an entry. Its image copies must already be stored.
 *
 * @param historyStore - The {@linkcode HistoryStore} to append to.
 * @param historyEntry - The run to record.
 */
export async function appendAsync(historyStore: HistoryStore, historyEntry: HistoryEntry): Promise<void> {
	const historyFile = nodePath.join(historyStore.root, HISTORY_FILE);
	await runLockedAsync(historyStore.root, async () =>
		appendFile(historyFile, `${JSON.stringify(historyEntry)}\n`, "utf8"),
	);
}

/**
 * Reads every valid entry, oldest first. A line that fails validation is
 * skipped with a warning, so one bad line can't hide the rest.
 *
 * @param historyStore - The {@linkcode HistoryStore} to read from.
 * @param warn - Receives a warning for each unreadable line.
 * @returns The entries.
 * @rejects When the history file exists but can't be read.
 */
export async function readAllAsync(
	historyStore: HistoryStore,
	warn: (message: string) => void,
): Promise<ReadonlyArray<HistoryEntry>> {
	const historyFile = nodePath.join(historyStore.root, HISTORY_FILE);
	let content: string;
	try {
		content = await readFile(historyFile, "utf8");
	} catch (error) {
		if (error instanceof Error && getErrorCode(error) === "ENOENT") {
			return [];
		}
		throw error;
	}

	const entries: Array<HistoryEntry> = [];
	for (const [index, line] of content.split("\n").entries()) {
		if (line.trim().length === 0) continue;

		const entry = parseLine(line);
		if (entry === undefined) {
			warn(`Skipping line ${index + 1} of ${historyFile}: it is not a valid run.`);
		} else {
			entries.push(entry);
		}
	}

	return entries;
}

/**
 * Deletes runs' entries and their image folders.
 *
 * @param historyStore - The {@linkcode HistoryStore} to delete from.
 * @param ids - The runs to delete.
 * @param warn - Receives a warning for each unreadable line.
 * @returns How many entries were removed.
 */
export async function deleteAsync(
	historyStore: HistoryStore,
	ids: ReadonlySet<string>,
	warn: (message: string) => void,
): Promise<number> {
	const historyFile = nodePath.join(historyStore.root, HISTORY_FILE);
	const removed = await runLockedAsync(historyStore.root, async () => {
		const entries = await readAllAsync(historyStore, warn);
		const kept = entries.filter((entry) => !ids.has(entry.id));
		const lines = kept.map((entry) => `${JSON.stringify(entry)}\n`).join("");
		await writeFileAtomicAsync(historyFile, lines);
		return entries.length - kept.length;
	});

	await Promise.all(
		Array.from(ids, async (id) => rm(getRunDirectory(historyStore, id), { force: true, recursive: true })),
	);
	return removed;
}

/**
 * Adds runs to a session forked from theirs, so the fork keeps them when
 * it is resumed. The runs stay in their own session too.
 *
 * @param historyStore - The {@linkcode HistoryStore} to update.
 * @param ids - The runs the fork keeps.
 * @param fork - The fork's ULID.
 * @param warn - Receives a warning for each unreadable line.
 */
export async function addToForkAsync(
	historyStore: HistoryStore,
	ids: ReadonlySet<string>,
	fork: string,
	warn: (message: string) => void,
): Promise<void> {
	const historyFile = nodePath.join(historyStore.root, HISTORY_FILE);
	await runLockedAsync(historyStore.root, async () => {
		const entries = await readAllAsync(historyStore, warn);
		const lines = entries.map((entry) => {
			const updated = ids.has(entry.id) ? { ...entry, forks: [...(entry.forks ?? []), fork] } : entry;
			return `${JSON.stringify(updated)}\n`;
		});

		await writeFileAtomicAsync(historyFile, lines.join(""));
	});
}

/**
 * Resolves a path stored in an entry.
 *
 * @param historyStore - The {@linkcode HistoryStore} to resolve against.
 * @param historyStore.root - The root folder of the history store.
 * @param stored - A path relative to the history directory.
 * @returns The absolute path.
 */
export function resolve({ root }: HistoryStore, stored: string): string {
	return nodePath.join(root, stored);
}

/**
 * Copies a run's files into its folder as `1.png`, `2.jpg`, and so on.
 *
 * @param historyStore - The {@linkcode HistoryStore} to store into.
 * @param id - The run's ULID.
 * @param files - The files, in order.
 * @param subdirectory - `refs` for reference images, or `""`.
 * @returns The stored paths, relative to the history directory.
 */
export async function storeFilesAsync(
	historyStore: HistoryStore,
	id: string,
	files: ReadonlyArray<StoredFile>,
	subdirectory: string,
): Promise<ReadonlyArray<string>> {
	const directory = nodePath.join(IMAGES_DIRECTORY, id, subdirectory);
	await mkdir(nodePath.join(historyStore.root, directory), { recursive: true });
	return Promise.all(
		files.map(async (file, index) => {
			const stored = nodePath.join(directory, `${index + 1}.${file.extension}`);
			await writeFileAtomicAsync(resolve(historyStore, stored), file.bytes);
			return stored;
		}),
	);
}

async function tryLockAsync(root: string): Promise<boolean> {
	const lockFile = nodePath.join(root, LOCK_FILE);
	try {
		const handle = await open(lockFile, "wx");
		await handle.close();
		return true;
	} catch (error) {
		if (!(error instanceof Error) || getErrorCode(error) !== "EEXIST") {
			throw error;
		}
	}

	const stats = await stat(lockFile).catch(() => undefined);
	if (stats !== undefined && Date.now() - stats.mtimeMs > STALE_LOCK_MS) {
		await rm(lockFile, { force: true });
	}

	return false;
}

async function acquireLockAsync(root: string): Promise<void> {
	await mkdir(root, { recursive: true });
	const deadline = Date.now() + LOCK_TIMEOUT_MS;
	while (Date.now() < deadline) {
		// oxlint-disable-next-line no-await-in-loop -- polling for the lock is inherently sequential
		if (await tryLockAsync(root)) return;
		// oxlint-disable-next-line no-await-in-loop -- see above
		await sleep(LOCK_RETRY_MS);
	}

	throw new Error(
		`Timed out waiting for ${nodePath.join(root, LOCK_FILE)}. Delete it if no other darkroom is running.`,
	);
}

async function runLockedAsync<Result>(root: string, callback: () => Promise<Result>): Promise<Result> {
	await acquireLockAsync(root);

	try {
		return await callback();
	} finally {
		await rm(nodePath.join(root, LOCK_FILE), { force: true });
	}
}

function parseLine(line: string): HistoryEntry | undefined {
	try {
		const result = isHistoryEntry(JSON.parse(line));
		return result instanceof type.errors ? undefined : result;
	} catch {
		return undefined;
	}
}

async function getDirectorySizeAsync(directory: string): Promise<number> {
	const entries = await readdir(directory, { recursive: true, withFileTypes: true }).catch(() => undefined);
	if (entries === undefined) return 0;

	const files: Array<string> = [];
	for (const entry of entries) {
		if (entry.isFile()) files.push(nodePath.join(entry.parentPath, entry.name));
	}
	const stats = await Promise.all(files.map(async (file) => stat(file)));

	let reduction = 0;
	for (const { size } of stats) {
		reduction += size;
	}

	return reduction;
}
