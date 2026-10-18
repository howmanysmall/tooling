import { mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { CACHE_TTL_MS } from "$constants";

import { cacheCompletionFunction } from "./cache-completion-function";

async function createDirectoryAsync(): Promise<string> {
	return mkdtemp(nodePath.join(tmpdir(), "darkroom-completion-cache-"));
}

interface Counter {
	readonly calls: Array<number>;
	readonly computeAsync: () => Promise<Array<string>>;
}

function createCounter(values: ReadonlyArray<string>): Counter {
	const calls: Array<number> = [];
	return {
		calls,
		async computeAsync(): Promise<Array<string>> {
			calls.push(calls.length + 1);
			return [...values];
		},
	};
}

describe("cacheCompletionFunction", () => {
	it("computes once and serves the cached copy afterwards", async ({ expect }) => {
		expect.assertions(3);

		const directory = await createDirectoryAsync();
		const counter = createCounter(["google", "openai"]);
		const getProvidersAsync = cacheCompletionFunction("providers", counter.computeAsync, directory);

		await expect(getProvidersAsync()).resolves.toStrictEqual(["google", "openai"]);
		await expect(getProvidersAsync()).resolves.toStrictEqual(["google", "openai"]);
		expect(counter.calls).toHaveLength(1);
	});

	it("computes again once the cached copy is a day old", async ({ expect }) => {
		expect.assertions(2);

		const directory = await createDirectoryAsync();
		const stale = nodePath.join(directory, "providers.json");
		await writeFile(stale, JSON.stringify(["old"]));
		const dayAgo = new Date(Date.now() - CACHE_TTL_MS - 1000);
		await utimes(stale, dayAgo, dayAgo);
		const counter = createCounter(["fresh"]);

		await expect(cacheCompletionFunction("providers", counter.computeAsync, directory)()).resolves.toStrictEqual([
			"fresh",
		]);
		expect(counter.calls).toHaveLength(1);
	});

	it("computes again when the cached copy is not valid JSON", async ({ expect }) => {
		expect.assertions(1);

		const directory = await createDirectoryAsync();
		await writeFile(nodePath.join(directory, "providers.json"), "{oops");

		await expect(
			cacheCompletionFunction("providers", createCounter(["fresh"]).computeAsync, directory)(),
		).resolves.toStrictEqual(["fresh"]);
	});
});
