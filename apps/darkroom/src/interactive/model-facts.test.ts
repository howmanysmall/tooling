import { describe, it } from "vitest";

import { createModel, MULTI_MODEL, SINGLE_MODEL } from "$generation/model-fixture";

import { getModelOptions, getModelStats, getPriceLines, splitModelName } from "./model-facts.ts";

import type { EndpointPricing } from "$generation/cost-estimate";

const FLUX_PRICES: ReadonlyArray<EndpointPricing> = [
	{
		pricing: [
			{ billable: "output_image", costUsd: 0.041, unit: "image", variant: "768" },
			{ billable: "output_image", costUsd: 0.1, unit: "image", variant: "2k" },
			{ billable: "input_image", costUsd: 0, unit: "image" },
		],
		provider: "bfl",
	},
];

describe("splitModelName", () => {
	it("separates the provider from the name, and keeps names without one", ({ expect }) => {
		expect.assertions(2);

		expect(splitModelName("Google: Nano Banana 2.1")).toStrictEqual({
			name: "Nano Banana 2.1",
			provider: "Google",
		});
		expect(splitModelName("Muse Image")).toStrictEqual({ name: "Muse Image" });
	});
});

describe("getModelStats", () => {
	it("shows the price and the limits, saying none when there are none", ({ expect }) => {
		expect.assertions(1);

		expect(getModelStats(SINGLE_MODEL, { endpoints: FLUX_PRICES }).slice(0, 5)).toStrictEqual([
			{ label: "price", value: "$0.041/img" },
			{ label: "inputs", value: "text · image" },
			{ label: "refs", value: "none" },
			{ label: "images", value: "up to 1" },
			{ label: "streams", value: "no" },
		]);
	});
});

describe("getModelOptions", () => {
	it("lists every option the model declares, with ranges and switches", ({ expect }) => {
		expect.assertions(1);

		const model = createModel("test/everything", {
			...MULTI_MODEL.supportedParameters,
			seed: { type: "boolean" },
			style_preset: { type: "enum", values: ["anime", "photo"] },
		});

		expect(getModelOptions(model)).toStrictEqual([
			{ label: "ratios", value: "1:1  16:9  auto" },
			{ label: "quality", value: "low  medium  high" },
			{ label: "background", value: "auto  transparent  opaque" },
			{ label: "formats", value: "png  jpeg  webp" },
			{ label: "compression", value: "0–100" },
			{ label: "seed", value: "yes" },
			{ label: "style preset", value: "anime  photo" },
		]);
	});
});

describe("getPriceLines", () => {
	it("names each tier and says when something is free", ({ expect }) => {
		expect.assertions(1);

		expect(getPriceLines({ endpoints: FLUX_PRICES })).toStrictEqual([
			{ label: "output · 768", value: "$0.041/img" },
			{ label: "output · 2k", value: "$0.1/img" },
			{ label: "input image", value: "free" },
		]);
	});

	it("ends with what past runs cost", ({ expect }) => {
		expect.assertions(1);

		const prices = { endpoints: FLUX_PRICES, observed: { images: 3, usdPerImage: 0.05 } };

		expect(getPriceLines(prices).at(-1)).toStrictEqual({ label: "your runs", value: "≈ $0.05/img over 3 images" });
	});

	it("names the provider when several serve the model", ({ expect }) => {
		expect.assertions(1);

		const second: EndpointPricing = {
			pricing: [{ billable: "output_image", costUsd: 0.05, unit: "image" }],
			provider: "fal",
		};

		expect(getPriceLines({ endpoints: [...FLUX_PRICES, second] }).at(-1)).toStrictEqual({
			label: "fal · output",
			value: "$0.05/img",
		});
	});
});
