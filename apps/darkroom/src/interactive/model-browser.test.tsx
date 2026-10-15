import { setTimeout as delay } from "node:timers/promises";
import { describe, it } from "vitest";
import { render } from "ink-testing-library";

import { createModel, MULTI_MODEL } from "$generation/model-fixture";
import { ModelSort } from "$utilities/model-filters";

import { ModelBrowserScreen } from "./model-browser-screen.tsx";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ModelCatalog } from "./model-browser-state.ts";

const DOWN = "\u001B[B";
const ENTER = "\r";

const BANANA = { ...createModel("google/banana", {}), name: "Google: Banana" };
const PALETTE = { ...MULTI_MODEL, name: "OpenAI: Palette" };
// Banana charges by the token, so its list price comes from past runs.
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
};

const BANANA_ROW = /Banana {2}Google +≈ \$0\.039\/img/u;
const BANANA_PRICING = /output +\$30\/M tok[\s\S]*your runs +≈ \$0\.039\/img over 2 images/u;
const PALETTE_PRICING = /output +\$0\.2\/img[\s\S]*input image +free/u;
const PALETTE_CHOICES = /quality +low {2}medium {2}high/u;

interface Harness {
	readonly chosen: Array<string>;
	readonly frame: () => string;
	readonly pressAsync: (...keys: ReadonlyArray<string>) => Promise<void>;
}

function createChooseHandler(chosen: Array<string>): (model: ImageModelListItem) => void {
	return (model) => {
		chosen.push(model.id);
	};
}

async function renderBrowserAsync(): Promise<Harness> {
	const chosen: Array<string> = [];
	const handleChoose = createChooseHandler(chosen);
	const instance = render(<ModelBrowserScreen catalog={CATALOG} sort={ModelSort.Name} onChoose={handleChoose} />);
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

	it("shows the choices a model offers", async ({ expect }) => {
		expect.assertions(1);

		const browser = await renderBrowserAsync();
		await browser.pressAsync(DOWN);

		expect(browser.frame()).toMatch(PALETTE_CHOICES);
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
