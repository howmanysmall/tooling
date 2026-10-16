import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";

import { deleteRunAsync } from "$history/delete-run";
import { createEntry } from "$history/history-fixture";
import { appendAsync, createHistoryStore, readAllAsync, resolve } from "$history/history-store";
import { renderScreen } from "$interactive/app/test-screen";

import { HistoryBrowserScreen } from "./history-browser-screen.tsx";

import type { RunDeletion } from "$history/delete-run";
import type { HistoryEntry } from "$history/history-entry";
import type { HistoryStore } from "$history/history-store";
import type { LoadingPreview } from "$preview/load-preview";

import type { BrowserServices } from "./history-browser-services";

// The fixtures are made on 2026-10-14, so their heading reads `Today`.
const NOW = new Date("2026-10-14T21:00:00.000Z");
const DOWN = "\u001B[B";
const ESCAPE = "\u001B";
const ENTER = "\r";

const NEWEST = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { prompt: "a cat in a hat" });
const MIDDLE = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { prompt: "a dog on a log" });
const OLDEST = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a tree by the sea" });
const NEWEST_FIRST: ReadonlyArray<HistoryEntry> = [NEWEST, MIDDLE, OLDEST];
const MODEL_ROW = /MODEL[\s\S]*gpt-image-1/u;
const RETURNED_ROW = /IMAGES[\s\S]*1 image/u;

const PREVIEW: LoadingPreview = { result: Promise.resolve({ kind: "image", lines: ["IMAGE ROW 1", "IMAGE ROW 2"] }) };
const PREVIEW_THEN_ID = /IMAGE ROW 2[\s\S]*id +01M4YV/u;

const BATCH = "01M4YVBATCHAAAAAAAAAAAAAAA";
const COMPARISON: ReadonlyArray<HistoryEntry> = [
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAB2", { batch: BATCH, model: "zeta/zeta-model" }),
	createEntry("01M4YVAAAAAAAAAAAAAAAAAAB1", { batch: BATCH, model: "alpha/alpha-model" }),
];
const CTRL_P = "\u0010";
const HELP_DIALOG = /Keys[\s\S]*y +Copy run ID[\s\S]*ctrl\+p +Command palette/u;
const PALETTE_MATCH = /Commands[\s\S]*Re-run +r/u;
const DELETE_DIALOG = /Delete this run\?[\s\S]*“a cat in a hat”[\s\S]*1\. Yes[\s\S]*3\. No/u;
const COMPARED_ROW = /compared +01M4YVAA · zeta-model/u;
// Ordered by model, with the selected run marked; a comparison opens on
// its first model.
const STRIP_LABELS = /▲ alpha-model +zeta-model/u;
const STEPPED_STRIP = /alpha-model +▲ zeta-model/u;
const RIGHT = "\u001B[C";

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
		async deleteRunAsync(entry: HistoryEntry, deletion: RunDeletion): Promise<void> {
			await deleteRunAsync(store, entry.id, [], deletion);
		},
		getPreview: () => undefined,
		async openRunAsync(entry: HistoryEntry): Promise<void> {
			opened.push(entry.id);
			await Promise.resolve();
		},
		requestRerun(entry: HistoryEntry): void {
			reruns.push(entry.id);
		},
		resolve: (stored) => resolve(store, stored),
	};
}

function addPreview(services: BrowserServices): BrowserServices {
	return { ...services, getPreview: () => PREVIEW };
}

async function renderBrowserAsync(): Promise<Harness> {
	const root = await mkdtemp(nodePath.join(tmpdir(), "darkroom-browser-"));
	const store = createHistoryStore(root);
	await appendAsync(store, OLDEST);
	await appendAsync(store, MIDDLE);
	await appendAsync(store, NEWEST);
	const opened: Array<string> = [];
	const reruns: Array<string> = [];
	const services = createServices(store, opened, reruns);
	const instance = renderScreen(<HistoryBrowserScreen entries={NEWEST_FIRST} now={NOW} services={services} />);
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
	const entries = await readAllAsync(store, () => undefined);
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

		const services = createServices(createHistoryStore(tmpdir()), [], []);
		const instance = renderScreen(<HistoryBrowserScreen entries={CROWDED_RUNS} now={NOW} services={services} />);
		await delay(20);
		const frame = String(instance.lastFrame());

		expect(frame).toMatch(MODEL_ROW);
		expect(frame).toMatch(RETURNED_ROW);
	});

	it("shows the selected run's image preview above its details", async ({ expect }) => {
		expect.assertions(1);

		const store = createHistoryStore(tmpdir());
		const services = addPreview(createServices(store, [], []));
		const instance = renderScreen(<HistoryBrowserScreen entries={NEWEST_FIRST} now={NOW} services={services} />);

		// React retries a suspended preview after about 300ms.
		await expect.poll(() => String(instance.lastFrame())).toMatch(PREVIEW_THEN_ID);
	});

	it("shows a comparison's images side by side, labeled by model", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const store = createHistoryStore(tmpdir());
		const services = addPreview(createServices(store, [], []));
		const instance = renderScreen(<HistoryBrowserScreen entries={COMPARISON} now={NOW} services={services} />);

		await expect.poll(() => String(instance.lastFrame())).toMatch(STRIP_LABELS);
		expect(String(instance.lastFrame())).toMatch(COMPARED_ROW);
	});

	it("lists a comparison once, and steps through its models with →", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const store = createHistoryStore(tmpdir());
		const instance = renderScreen(
			<HistoryBrowserScreen entries={COMPARISON} now={NOW} services={createServices(store, [], [])} />,
		);
		await delay(20);

		// The row is cut at the pane's edge in the test's narrow terminal.
		expect(String(instance.lastFrame())).toContain("◫ 2 mode");

		instance.stdin.write(RIGHT);

		await expect.poll(() => String(instance.lastFrame())).toMatch(STEPPED_STRIP);
	});

	it("filters the list as the filter is typed, and Esc clears it", async ({ expect }) => {
		expect.assertions(3);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("/", "tree");

		expect(browser.frame()).toContain("1 of 3 runs");
		expect(browser.frame()).toMatch(showsDetailFor(OLDEST));

		await browser.pressAsync(ESCAPE);

		expect(browser.frame()).toContain("  3 runs ·");
	});

	it("keeps the run when the delete question is dismissed", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("d");

		expect(browser.frame()).toMatch(DELETE_DIALOG);

		await browser.pressAsync(ESCAPE);

		await expect(readIdsAsync(browser.store)).resolves.toStrictEqual([OLDEST.id, MIDDLE.id, NEWEST.id]);
	});

	it("removes the run from the list and the store when the delete is confirmed", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(DOWN, "d", "1");

		// The delete rewrites the history file under its lock before the list
		// updates.
		await expect.poll(browser.frame).toMatch(showsDetailFor(OLDEST));
		await expect(readIdsAsync(browser.store)).resolves.toStrictEqual([OLDEST.id, NEWEST.id]);
	});

	it("lists every key in the ? help, and any key closes it", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("?");

		expect(browser.frame()).toMatch(HELP_DIALOG);

		await browser.pressAsync("x");

		expect(browser.frame()).not.toContain("Command palette");
	});

	it("finds and runs a command from the ctrl+p palette", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(CTRL_P, "re-r");

		expect(browser.frame()).toMatch(PALETTE_MATCH);

		await browser.pressAsync(ENTER);

		expect(browser.reruns).toStrictEqual([NEWEST.id]);
	});

	it("opens the selected run with Enter and hands it over for a re-run with r", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(ENTER, DOWN, "r");

		expect(browser.opened).toStrictEqual([NEWEST.id]);
		expect(browser.reruns).toStrictEqual([MIDDLE.id]);
	});
});
