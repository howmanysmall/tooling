import { appendFile, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { createEntry } from "./history-fixture";
import {
	appendAsync,
	createHistoryStore,
	deleteAsync,
	getRunDirectory,
	getRunSizeAsync,
	readAllAsync,
	resolve,
	storeFilesAsync,
} from "./history-store";

import type { HistoryStore } from "./history-store";

const FIRST = "01M4YVAKWVPWQQRBEKXDKQYBW1";
const SECOND = "01M4YVAKWVPWQQRBEKXDKQYBW2";

async function createStoreAsync(): Promise<HistoryStore> {
	const root = await mkdtemp(nodePath.join(tmpdir(), "darkroom-history-"));
	return createHistoryStore(root);
}

describe("historyStore", () => {
	it("reads back appended runs in order, skipping a corrupt line with a warning", async ({ expect }) => {
		expect.assertions(2);

		const store = await createStoreAsync();
		await appendAsync(store, createEntry(FIRST));
		await appendFile(nodePath.join(store.root, "history.jsonl"), "{not json\n");
		await appendAsync(store, createEntry(SECOND));
		const warnings: Array<string> = [];

		const entries = await readAllAsync(store, (message) => {
			warnings.push(message);
		});

		expect(entries.map((entry) => entry.id)).toStrictEqual([FIRST, SECOND]);
		expect(warnings).toStrictEqual([
			`Skipping line 2 of ${nodePath.join(store.root, "history.jsonl")}: it is not a valid run.`,
		]);
	});

	it("is empty before the first run", async ({ expect }) => {
		expect.assertions(1);

		const store = await createStoreAsync();

		await expect(readAllAsync(store, () => undefined)).resolves.toStrictEqual([]);
	});

	it("stores numbered copies and reports their size", async ({ expect }) => {
		expect.assertions(3);

		const store = await createStoreAsync();
		const stored = await storeFilesAsync(
			store,
			FIRST,
			[
				{ bytes: new Uint8Array(10), extension: "png" },
				{ bytes: new Uint8Array(5), extension: "webp" },
			],
			"",
		);

		expect(stored).toStrictEqual([`images/${FIRST}/1.png`, `images/${FIRST}/2.webp`]);
		await expect(readFile(resolve(store, `images/${FIRST}/2.webp`))).resolves.toHaveLength(5);
		await expect(getRunSizeAsync(store, FIRST)).resolves.toBe(15);
	});

	it("deletes entries and their image folders, keeping the rest", async ({ expect }) => {
		expect.assertions(3);

		const store = await createStoreAsync();
		await storeFilesAsync(store, FIRST, [{ bytes: new Uint8Array(1), extension: "png" }], "");
		await appendAsync(store, createEntry(FIRST));
		await appendAsync(store, createEntry(SECOND));

		const removed = await deleteAsync(store, new Set([FIRST]), () => undefined);
		const entries = await readAllAsync(store, () => undefined);

		expect(removed).toBe(1);
		expect(entries.map((entry) => entry.id)).toStrictEqual([SECOND]);
		await expect(stat(getRunDirectory(store, FIRST))).rejects.toThrow("ENOENT");
	});

	it("keeps every run when many are appended at once", async ({ expect }) => {
		expect.assertions(1);

		const store = await createStoreAsync();
		const ids = Array.from(
			{ length: 20 },
			(_, index) => `01M4YVAKWVPWQQRBEKXDKQY${String(index).padStart(3, "0")}`,
		);
		await Promise.all(ids.map(async (id) => appendAsync(store, createEntry(id))));

		const entries = await readAllAsync(store, () => undefined);

		expect(entries).toHaveLength(20);
	});
});
