import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { render } from "ink-testing-library";

import { createEntry } from "$history/history-fixture";
import { HistoryStore } from "$history/history-store";

import { HistoryBrowser } from "./history-browser.tsx";

import type { HistoryEntry } from "$history/history-entry";

import type { BrowserServices } from "./history-browser.tsx";

const DOWN = "\u001B[B";
const ESCAPE = "\u001B";
const ENTER = "\r";

const NEWEST = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { prompt: "a cat in a hat" });
const MIDDLE = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { prompt: "a dog on a log" });
const OLDEST = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a tree by the sea" });
const NEWEST_FIRST: ReadonlyArray<HistoryEntry> = [NEWEST, MIDDLE, OLDEST];
const MODEL_ROW = /model +openai\/gpt-image-1/u;
const RETURNED_ROW = /returned +1 of 1/u;

// More detail rows than the pane can show.
const CROWDED_RUNS: ReadonlyArray<HistoryEntry> = [
	createEntry(NEWEST.id, {
		prompt: "a cat in a hat ".repeat(12),
		references: Array.from({ length: 30 }, (_, index) => ({
			source: `/refs/reference-${index}.png`,
			stored: `images/${NEWEST.id}/refs/${index}.png`,
		})),
	}),
];

interface Harness {
	readonly frame: () => string;
	readonly opened: Array<string>;
	/** Sends keys one at a time, as a person would type them. */
	readonly pressAsync: (...keys: ReadonlyArray<string>) => Promise<void>;
	readonly reruns: Array<string>;
	readonly store: HistoryStore;
}

function createServices(store: HistoryStore, opened: Array<string>, reruns: Array<string>): BrowserServices {
	return {
		async deleteRunAsync(entry: HistoryEntry): Promise<void> {
			await store.deleteAsync(new Set([entry.id]), () => undefined);
		},
		async openRunAsync(entry: HistoryEntry): Promise<void> {
			opened.push(entry.id);
			await Promise.resolve();
		},
		requestRerun(entry: HistoryEntry): void {
			reruns.push(entry.id);
		},
		resolve: (stored) => store.resolve(stored),
	};
}

async function renderBrowserAsync(): Promise<Harness> {
	const root = await mkdtemp(nodePath.join(tmpdir(), "darkroom-browser-"));
	const store = new HistoryStore(root);
	await store.appendAsync(OLDEST);
	await store.appendAsync(MIDDLE);
	await store.appendAsync(NEWEST);
	const opened: Array<string> = [];
	const reruns: Array<string> = [];
	const services = createServices(store, opened, reruns);
	const instance = render(<HistoryBrowser entries={NEWEST_FIRST} services={services} />);
	await delay(20);

	return {
		frame: () => instance.lastFrame() ?? "",
		opened,
		async pressAsync(...keys: ReadonlyArray<string>): Promise<void> {
			for (const key of keys) {
				instance.stdin.write(key);
				// Ink holds a lone Esc for 20ms in case a sequence follows.
				// oxlint-disable-next-line no-await-in-loop -- one key at a time, as typed
				await delay(50);
			}
		},
		reruns,
		store,
	};
}

async function readIdsAsync(store: HistoryStore): Promise<Array<string>> {
	const entries = await store.readAllAsync(() => undefined);
	return entries.map((entry) => entry.id);
}

function showsDetailFor(entry: HistoryEntry): RegExp {
	return new RegExp(`id +${entry.id}`, "u");
}

describe("history browser", () => {
	it("shows the selected run in the detail pane as the selection moves", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();

		expect(browser.frame()).toMatch(showsDetailFor(NEWEST));

		await browser.pressAsync(DOWN);

		expect(browser.frame()).toMatch(showsDetailFor(MIDDLE));
	});

	it("keeps every detail row intact when the run is too long for the pane", async ({ expect }) => {
		expect.assertions(2);

		const services = createServices(new HistoryStore(tmpdir()), [], []);
		const instance = render(<HistoryBrowser entries={CROWDED_RUNS} services={services} />);
		await delay(20);
		const frame = String(instance.lastFrame());

		expect(frame).toMatch(MODEL_ROW);
		expect(frame).toMatch(RETURNED_ROW);
	});

	it("filters the list as the filter is typed, and Esc clears it", async ({ expect }) => {
		expect.assertions(3);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("/", "tree");

		expect(browser.frame()).toContain("1 of 3 runs");
		expect(browser.frame()).toMatch(showsDetailFor(OLDEST));

		await browser.pressAsync(ESCAPE);

		expect(browser.frame()).toContain("· 3 runs");
	});

	it("keeps the run when the delete question is answered with n", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("d");

		expect(browser.frame()).toContain("Delete run");

		await browser.pressAsync("n");

		await expect(readIdsAsync(browser.store)).resolves.toStrictEqual([OLDEST.id, MIDDLE.id, NEWEST.id]);
	});

	it("removes the run from the list and the store when the delete is confirmed", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(DOWN, "d", "y");

		// The delete rewrites the history file under its lock before the list
		// updates.
		await expect.poll(browser.frame).toMatch(showsDetailFor(OLDEST));
		await expect(readIdsAsync(browser.store)).resolves.toStrictEqual([OLDEST.id, NEWEST.id]);
	});

	it("opens the selected run with Enter and hands it over for a re-run with r", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(ENTER, DOWN, "r");

		expect(browser.opened).toStrictEqual([NEWEST.id]);
		expect(browser.reruns).toStrictEqual([MIDDLE.id]);
	});
});
