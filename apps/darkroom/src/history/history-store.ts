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
export class HistoryStore {
	public readonly root: string;

	public constructor(root: string) {
		this.root = root;
	}

	/**
	 * Adds an entry. Its image copies must already be stored.
	 *
	 * @param entry - The run to record.
	 */
	public async appendAsync(entry: HistoryEntry): Promise<void> {
		await this.runLockedAsync(async () => appendFile(this.historyFile, `${JSON.stringify(entry)}\n`, "utf8"));
	}

	/**
	 * Deletes runs' entries and their image folders.
	 *
	 * @param ids - The runs to delete.
	 * @param warn - Receives a warning for each unreadable line.
	 * @returns How many entries were removed.
	 */
	public async deleteAsync(ids: ReadonlySet<string>, warn: (message: string) => void): Promise<number> {
		const removed = await this.runLockedAsync(async () => {
			const entries = await this.readAllAsync(warn);
			const kept = entries.filter((entry) => !ids.has(entry.id));
			const lines = kept.map((entry) => `${JSON.stringify(entry)}\n`).join("");
			await writeFileAtomicAsync(this.historyFile, lines);
			return entries.length - kept.length;
		});
		await Promise.all(
			Array.from(ids, async (id) => rm(this.getRunDirectory(id), { force: true, recursive: true })),
		);
		return removed;
	}

	/**
	 * Gets the folder holding a run's image copies.
	 *
	 * @param id - The run's ULID.
	 * @returns The absolute path.
	 */
	public getRunDirectory(id: string): string {
		return nodePath.join(this.root, IMAGES_DIRECTORY, id);
	}

	/**
	 * Measures how much space a run's copies take.
	 *
	 * @param id - The run's ULID.
	 * @returns The total size in bytes, or 0 when the folder is missing.
	 */
	public async getRunSizeAsync(id: string): Promise<number> {
		return getDirectorySizeAsync(this.getRunDirectory(id));
	}

	/**
	 * Reads every valid entry, oldest first. A line that fails validation is
	 * skipped with a warning, so one bad line can't hide the rest.
	 *
	 * @param warn - Receives a warning for each unreadable line.
	 * @returns The entries.
	 * @rejects When the history file exists but can't be read.
	 */
	public async readAllAsync(warn: (message: string) => void): Promise<Array<HistoryEntry>> {
		let content: string;
		try {
			content = await readFile(this.historyFile, "utf8");
		} catch (error) {
			if (error instanceof Error && getErrorCode(error) === "ENOENT") return [];
			throw error;
		}

		const entries: Array<HistoryEntry> = [];
		for (const [index, line] of content.split("\n").entries()) {
			if (line.trim() === "") continue;
			const entry = parseLine(line);
			if (entry === undefined) warn(`Skipping line ${index + 1} of ${this.historyFile}: it is not a valid run.`);
			else entries.push(entry);
		}
		return entries;
	}

	/**
	 * Resolves a path stored in an entry.
	 *
	 * @param stored - A path relative to the history directory.
	 * @returns The absolute path.
	 */
	public resolve(stored: string): string {
		return nodePath.join(this.root, stored);
	}

	/**
	 * Copies a run's files into its folder as `1.png`, `2.jpg`, and so on.
	 *
	 * @param id - The run's ULID.
	 * @param files - The files, in order.
	 * @param subdirectory - `refs` for reference images, or `""`.
	 * @returns The stored paths, relative to the history directory.
	 */
	public async storeFilesAsync(
		id: string,
		files: ReadonlyArray<StoredFile>,
		subdirectory: string,
	): Promise<Array<string>> {
		const directory = nodePath.join(IMAGES_DIRECTORY, id, subdirectory);
		await mkdir(nodePath.join(this.root, directory), { recursive: true });
		return Promise.all(
			files.map(async (file, index) => {
				const stored = nodePath.join(directory, `${index + 1}.${file.extension}`);
				await writeFileAtomicAsync(this.resolve(stored), file.bytes);
				return stored;
			}),
		);
	}

	private async acquireLockAsync(): Promise<void> {
		await mkdir(this.root, { recursive: true });
		const deadline = Date.now() + LOCK_TIMEOUT_MS;
		while (Date.now() < deadline) {
			// oxlint-disable-next-line no-await-in-loop -- polling for the lock is inherently sequential
			if (await this.tryLockAsync()) return;
			// oxlint-disable-next-line no-await-in-loop -- see above
			await sleep(LOCK_RETRY_MS);
		}
		throw new Error(`Timed out waiting for ${this.lockFile}. Delete it if no other darkroom is running.`);
	}

	private get historyFile(): string {
		return nodePath.join(this.root, HISTORY_FILE);
	}

	private get lockFile(): string {
		return nodePath.join(this.root, LOCK_FILE);
	}

	private async runLockedAsync<Result>(callback: () => Promise<Result>): Promise<Result> {
		await this.acquireLockAsync();
		try {
			return await callback();
		} finally {
			await rm(this.lockFile, { force: true });
		}
	}

	private async tryLockAsync(): Promise<boolean> {
		try {
			const handle = await open(this.lockFile, "wx");
			await handle.close();
			return true;
		} catch (error) {
			if (!(error instanceof Error) || getErrorCode(error) !== "EEXIST") throw error;
		}

		const stats = await stat(this.lockFile).catch(() => undefined);
		if (stats !== undefined && Date.now() - stats.mtimeMs > STALE_LOCK_MS) await rm(this.lockFile, { force: true });
		return false;
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
	for (const entry of entries) if (entry.isFile()) files.push(nodePath.join(entry.parentPath, entry.name));
	const stats = await Promise.all(files.map(async (file) => stat(file)));
	return stats.reduce((total, { size }) => total + size, 0);
}
