import { mkdir, readFile, stat } from "node:fs/promises";
import nodePath from "node:path";

import { CACHE_TTL_MS } from "$constants";
import { environmentPaths } from "$constants/environment-paths";
import { writeFileAtomicAsync } from "$utilities/atomic-write";
import { makeStringSafeForPath } from "$utilities/path-utilities";

async function readFreshAsync<TReturns>(jsonFile: string): Promise<TReturns | undefined> {
	try {
		const stats = await stat(jsonFile);
		if (Date.now() - stats.mtimeMs >= CACHE_TTL_MS) return undefined;
		// Only getCachedAsync writes this file, from the callback's own result.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see above
		return JSON.parse(await readFile(jsonFile, "utf8")) as TReturns;
	} catch {
		// Missing or unreadable: compute it again.
		return undefined;
	}
}

/**
 * Wraps a shell completion callback so its result is kept as JSON in the
 * cache directory for a day. Completions run a fresh process per keystroke,
 * so an expensive callback only runs when the cached copy is missing or stale.
 *
 * @template TReturns - What the callback resolves to; it must survive JSON.
 * @param name - A name for the cache file, unique per callback.
 * @param callback - Computes the completions.
 * @param directory - Where the cache file lives.
 * @returns The cached callback.
 */
export function cacheCompletionFunction<TReturns>(
	name: string,
	callback: () => Promise<TReturns>,
	directory = environmentPaths.cache,
): () => Promise<TReturns> {
	const jsonFile = nodePath.join(directory, `${makeStringSafeForPath(name)}.json`);

	return async function getCachedAsync(): Promise<TReturns> {
		const cached = await readFreshAsync<TReturns>(jsonFile);
		if (cached !== undefined) return cached;

		const value = await callback();
		try {
			await mkdir(directory, { recursive: true });
			// Atomic, so a completion running at the same time never reads half
			// a file.
			await writeFileAtomicAsync(jsonFile, JSON.stringify(value));
		} catch {
			// A cache that can't be written only costs speed.
		}
		return value;
	};
}
