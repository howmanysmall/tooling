import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";

import { createModel, MULTI_MODEL } from "$generation/model-fixture";
import { renderScreen } from "$interactive/app/test-screen";
import { ModelSort } from "$utilities/model-filters";

import { ModelBrowserScreen } from "./model-browser-screen";
import { ExampleSource } from "./model-examples";

import type { LoadingPreview } from "$preview/load-preview";

import type { ModelBrowserServices } from "./model-browser-services";
import type { ModelCatalog } from "./model-browser-state";

const DOWN = "\u001B[B";
const ENTER = "\r";

const BANANA = { ...createModel("google/banana", {}), name: "Google: Banana" };
const PALETTE = { ...MULTI_MODEL, name: "OpenAI: Palette" };

// Banana charges by the token, so its list price comes from past runs. Only
// Palette has made an image.
const CATALOG: ModelCatalog = {
	models: [PALETTE, BANANA],
	observed: new Map([[BANANA.id, { images: 2, usdPerImage: 0.039 }]]),
	pricing: {
		[BANANA.id]: [{ pricing: [{ billable: "output_image", costUsd: 0.00003, unit: "token" }], provider: "google" }],
		[PALETTE.id]: [
			{
				pricing: [
					{ billable: "output_image", costUsd: 0.2, unit: "image" },
					{ billable: "input_image", costUsd: 0, unit: "image" },
				],
				provider: "openai",
			},
		],
	},
	shippedExamples: new Map(),
	yourExamples: new Map([
		[
			PALETTE.id,
			{
				created: "2026-10-14T20:30:00.000Z",
				path: "/data/images/x/1.png",
				prompt: "a fox in snow",
				source: ExampleSource.Yours,
			},
		],
	]),
};

const BANANA_ROW = /Banana {2}Google +≈ \$0\.039\/img/u;
const BANANA_PRICING = /output +\$30\/M tok[\s\S]*your runs +≈ \$0\.039\/img over 2 images/u;
const PALETTE_PRICING = /output +\$0\.2\/img[\s\S]*input image +free/u;
const PALETTE_CHOICES = /quality +low {2}medium {2}high/u;
const PALETTE_EXAMPLE = /EXAMPLE IMAGE[\s\S]*your latest · “a fox in snow” · Today/u;
const NOW = new Date("2026-10-14T21:00:00.000Z");
const PREVIEW: LoadingPreview = { result: Promise.resolve({ kind: "image", lines: ["EXAMPLE IMAGE"] }) };

interface Harness {
	readonly chosen: Array<string>;
	readonly frame: () => string;
	readonly pressAsync: (...keys: ReadonlyArray<string>) => Promise<void>;
}

function createServices(chosen: Array<string>): ModelBrowserServices {
	return {
		chooseModel(model): void {
			chosen.push(model.id);
		},
		getPreview: () => PREVIEW,
	};
}

async function renderBrowserAsync(): Promise<Harness> {
	const chosen: Array<string> = [];
	const services = createServices(chosen);
	const instance = renderScreen(
		<ModelBrowserScreen catalog={CATALOG} now={NOW} services={services} sort={ModelSort.Name} />,
	);

	await delay(20);

	return {
		chosen,
		frame: () => instance.lastFrame() ?? "",
		async pressAsync(...keys): Promise<void> {
			for (const key of keys) {
				instance.stdin.write(key);
				// oxlint-disable-next-line no-await-in-loop -- one key at a time, as typed
				await delay(50);
			}
		},
	};
}

describe("model browser", () => {
	it("lists each model with its price, and details the selected one", async ({ expect }) => {
		expect.assertions(3);

		const browser = await renderBrowserAsync();

		expect(browser.frame()).toMatch(BANANA_ROW);
		expect(browser.frame()).toMatch(BANANA_PRICING);

		await browser.pressAsync(DOWN);

		expect(browser.frame()).toMatch(PALETTE_PRICING);
	});

	it("shows the options a model takes", async ({ expect }) => {
		expect.assertions(1);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(DOWN);

		expect(browser.frame()).toMatch(PALETTE_CHOICES);
	});

	it("shows your newest image from the model, captioned, and none for unused models", async ({ expect }) => {
		// oxlint-disable-next-line small-rules/prefer-expect-assertions -- vitest counts expect.poll, this rule does not
		expect.assertions(2);

		const browser = await renderBrowserAsync();

		expect(browser.frame()).not.toContain("your latest");

		await browser.pressAsync(DOWN);

		// React retries a suspended preview after about 300ms.
		await expect.poll(browser.frame).toMatch(PALETTE_EXAMPLE);
	});

	it("sorts by price with s and filters with /", async ({ expect }) => {
		expect.assertions(2);

		const browser = await renderBrowserAsync();
		await browser.pressAsync("s");

		expect(browser.frame()).toContain("2 models · cheapest first");

		await browser.pressAsync("/", "palette");

		expect(browser.frame()).toContain("1 of 2 models");
	});

	it("hands the selected model over with Enter", async ({ expect }) => {
		expect.assertions(1);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(DOWN, ENTER);

		expect(browser.chosen).toStrictEqual([PALETTE.id]);
	});
});
