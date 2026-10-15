import { appendFile, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { createEntry } from "./history-fixture.ts";
import { HistoryStore } from "./history-store.ts";

const FIRST = "01M4YVAKWVPWQQRBEKXDKQYBW1";
const SECOND = "01M4YVAKWVPWQQRBEKXDKQYBW2";

async function createStoreAsync(): Promise<HistoryStore> {
	const root = await mkdtemp(nodePath.join(tmpdir(), "darkroom-history-"));
	return new HistoryStore(root);
}

describe("historyStore", () => {
	it("reads back appended runs in order, skipping a corrupt line with a warning", async ({ expect }) => {
		expect.assertions(2);

		const store = await createStoreAsync();
		await store.appendAsync(createEntry(FIRST));
		await appendFile(nodePath.join(store.root, "history.jsonl"), "{not json\n");
		await store.appendAsync(createEntry(SECOND));
		const warnings: Array<string> = [];

		const entries = await store.readAllAsync((message) => {
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

		await expect(store.readAllAsync(() => undefined)).resolves.toStrictEqual([]);
	});

	it("stores numbered copies and reports their size", async ({ expect }) => {
		expect.assertions(3);

		const store = await createStoreAsync();
		const stored = await store.storeFilesAsync(
			FIRST,
			[
				{ bytes: new Uint8Array(10), extension: "png" },
				{ bytes: new Uint8Array(5), extension: "webp" },
			],
			"",
		);

		expect(stored).toStrictEqual([`images/${FIRST}/1.png`, `images/${FIRST}/2.webp`]);
		await expect(readFile(store.resolve(`images/${FIRST}/2.webp`))).resolves.toHaveLength(5);
		await expect(store.getRunSizeAsync(FIRST)).resolves.toBe(15);
	});

	it("deletes entries and their image folders, keeping the rest", async ({ expect }) => {
		expect.assertions(3);

		const store = await createStoreAsync();
		await store.storeFilesAsync(FIRST, [{ bytes: new Uint8Array(1), extension: "png" }], "");
		await store.appendAsync(createEntry(FIRST));
		await store.appendAsync(createEntry(SECOND));

		const removed = await store.deleteAsync(new Set([FIRST]), () => undefined);
		const entries = await store.readAllAsync(() => undefined);

		expect(removed).toBe(1);
		expect(entries.map((entry) => entry.id)).toStrictEqual([SECOND]);
		await expect(stat(store.getRunDirectory(FIRST))).rejects.toThrow("ENOENT");
	});

	it("keeps every run when many are appended at once", async ({ expect }) => {
		expect.assertions(1);

		const store = await createStoreAsync();
		const ids = Array.from(
			{ length: 20 },
			(_, index) => `01M4YVAKWVPWQQRBEKXDKQY${String(index).padStart(3, "0")}`,
		);
		await Promise.all(ids.map(async (id) => store.appendAsync(createEntry(id))));

		const entries = await store.readAllAsync(() => undefined);

		expect(entries).toHaveLength(20);
	});
});
