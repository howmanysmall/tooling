import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";

import {
	compareModelPrices,
	describeListPrice,
	getModelPrices,
	getObservedPrices,
	getPerImagePrice,
} from "./observed-prices";

import type { EndpointPricing } from "./cost-estimate";
import type { ModelPrices } from "./observed-prices";

const TOKENS: ReadonlyArray<EndpointPricing> = [
	{ pricing: [{ billable: "output_image", costUsd: 0.00003, unit: "token" }], provider: "google" },
];
const PER_IMAGE: ReadonlyArray<EndpointPricing> = [
	{ pricing: [{ billable: "output_image", costUsd: 0.05, unit: "image" }], provider: "openai" },
];

describe("getObservedPrices", () => {
	it("averages what each model was charged per image, skipping runs without a cost", ({ expect }) => {
		expect.assertions(1);

		const runs = [
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { cost: 0.04, model: "google/banana", returned: 1 }),
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA2", { cost: 0.08, model: "google/banana", returned: 3 }),
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", { cost: undefined, model: "google/banana", returned: 1 }),
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA4", { cost: 0.1, model: "openai/palette", returned: 0 }),
		];

		expect(getObservedPrices(runs)).toStrictEqual(new Map([["google/banana", { images: 4, usdPerImage: 0.03 }]]));
	});
});

describe("describeListPrice", () => {
	it("prefers a published price per image, then past runs, then the unit price", ({ expect }) => {
		expect.assertions(4);

		const observed = { images: 4, usdPerImage: 0.039 };

		expect(describeListPrice({ endpoints: PER_IMAGE, observed })).toBe("$0.05/img");
		expect(describeListPrice({ endpoints: TOKENS, observed })).toBe("≈ $0.039/img");
		expect(describeListPrice({ endpoints: TOKENS })).toBe("$30/M tok");
		expect(describeListPrice({ endpoints: [] })).toBe("—");
	});
});

describe("compareModelPrices", () => {
	it("puts models with a known price per image first, cheapest first", ({ expect }) => {
		expect.assertions(1);

		const estimated: ModelPrices = { endpoints: TOKENS, observed: { images: 1, usdPerImage: 0.02 } };
		const published: ModelPrices = { endpoints: PER_IMAGE };
		const unknown: ModelPrices = { endpoints: TOKENS };

		expect(
			[unknown, published, estimated].toSorted(compareModelPrices).map((prices) => getPerImagePrice(prices)),
		).toStrictEqual([0.02, 0.05, undefined]);
	});
});

describe("getModelPrices", () => {
	it("gathers a model's published and observed prices", ({ expect }) => {
		expect.assertions(1);

		const observed = new Map([["google/banana", { images: 1, usdPerImage: 0.04 }]]);

		expect(getModelPrices({ "google/banana": TOKENS }, observed, "google/banana")).toStrictEqual({
			endpoints: TOKENS,
			observed: { images: 1, usdPerImage: 0.04 },
		});
	});
});
