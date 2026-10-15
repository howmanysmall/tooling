import { describe, it } from "vitest";

import {
	comparePrices,
	describeEstimate,
	formatUnitPrice,
	getCostEstimate,
	getListPrice,
	getMegapixels,
} from "./cost-estimate.ts";

import type { EndpointPricing } from "./cost-estimate.ts";

const PER_IMAGE: ReadonlyArray<EndpointPricing> = [
	{
		pricing: [
			{ billable: "output_image", costUsd: 0.15, unit: "image" },
			{ billable: "output_image", costUsd: 0.33, unit: "image", variant: "4k" },
			{ billable: "input_reference", costUsd: 0.2, unit: "image" },
		],
		provider: "sourceful",
	},
];
const QUALITY_TIERS: ReadonlyArray<EndpointPricing> = [
	{
		pricing: [
			{ billable: "output_image", costUsd: 0.04, unit: "image", variant: "low_1k" },
			{ billable: "output_image", costUsd: 0.08, unit: "image", variant: "medium_2k" },
		],
		provider: "xai",
	},
];
const PER_MEGAPIXEL: ReadonlyArray<EndpointPricing> = [
	{ pricing: [{ billable: "output_image", costUsd: 0.03, unit: "megapixel" }], provider: "bfl" },
];
const PER_TOKEN: ReadonlyArray<EndpointPricing> = [
	{ pricing: [{ billable: "output_image", costUsd: 0.000_03, unit: "token" }], provider: "google" },
];

describe("getCostEstimate", () => {
	it("multiplies a per-image price by the count and adds per-image reference charges", ({ expect }) => {
		expect.assertions(1);

		expect(getCostEstimate(PER_IMAGE, { count: 2, referenceCount: 1 })).toStrictEqual({
			isApproximate: false,
			provider: "sourceful",
			usd: 0.5,
		});
	});

	it("uses the variant matching the resolution, or quality and resolution together", ({ expect }) => {
		expect.assertions(2);

		expect(getCostEstimate(PER_IMAGE, { count: 1, referenceCount: 0, resolution: "4K" })?.usd).toBe(0.33);
		expect(
			getCostEstimate(QUALITY_TIERS, { count: 1, quality: "medium", referenceCount: 0, resolution: "2K" })?.usd,
		).toBe(0.08);
	});

	it("estimates megapixel prices only when the size is known", ({ expect }) => {
		expect.assertions(2);

		const estimate = getCostEstimate(PER_MEGAPIXEL, {
			aspectRatio: "1:1",
			count: 1,
			referenceCount: 0,
			resolution: "1K",
		});

		expect(estimate).toMatchObject({ isApproximate: true, usd: 0.03 * 1.048_576 });
		expect(
			getCostEstimate(PER_MEGAPIXEL, { aspectRatio: "auto", count: 1, referenceCount: 0, resolution: "1K" }),
		).toBeUndefined();
	});

	it("can't estimate token prices or tiers the request doesn't pick", ({ expect }) => {
		expect.assertions(2);

		expect(getCostEstimate(PER_TOKEN, { count: 1, referenceCount: 0 })).toBeUndefined();
		expect(getCostEstimate(QUALITY_TIERS, { count: 1, referenceCount: 0 })).toBeUndefined();
	});

	it("picks the cheapest endpoint", ({ expect }) => {
		expect.assertions(1);

		const endpoints = [
			{ pricing: [{ billable: "output_image", costUsd: 0.06, unit: "image" }], provider: "a" },
			{ pricing: [{ billable: "output_image", costUsd: 0.04, unit: "image" }], provider: "b" },
		];

		expect(getCostEstimate(endpoints, { count: 1, referenceCount: 0 })?.provider).toBe("b");
	});
});

describe("getMegapixels", () => {
	it("treats the tier as the long edge", ({ expect }) => {
		expect.assertions(1);

		expect(getMegapixels("2K", "16:9")).toBe((2048 * 1152) / 1e6);
	});
});

describe("list prices", () => {
	it("formats prices per unit", ({ expect }) => {
		expect.assertions(3);

		expect(formatUnitPrice({ billable: "output_image", costUsd: 0.039, unit: "image" })).toBe("$0.039/img");
		expect(formatUnitPrice({ billable: "output_image", costUsd: 0.02, unit: "megapixel" })).toBe("$0.02/MP");
		expect(formatUnitPrice({ billable: "output_image", costUsd: 0.000_03, unit: "token" })).toBe("$30/M tok");
	});

	it("shows the default price, or the cheapest tier when there is no default", ({ expect }) => {
		expect.assertions(2);

		expect(getListPrice(PER_IMAGE)?.costUsd).toBe(0.15);
		expect(getListPrice(QUALITY_TIERS)?.costUsd).toBe(0.04);
	});

	it("sorts per-image prices first, then other units, then unknown", ({ expect }) => {
		expect.assertions(1);

		const prices = [
			getListPrice(PER_TOKEN),
			undefined,
			getListPrice(PER_IMAGE),
			getListPrice(PER_MEGAPIXEL),
			getListPrice(QUALITY_TIERS),
		];

		expect(prices.toSorted(comparePrices).map((price) => price?.costUsd)).toStrictEqual([
			0.04,
			0.15,
			0.03,
			0.000_03,
			undefined,
		]);
	});

	it("describes an estimate, falling back to the unit price", ({ expect }) => {
		expect.assertions(2);

		expect(describeEstimate({ isApproximate: true, provider: "bfl", usd: 0.031 }, PER_MEGAPIXEL)).toBe("≈ $0.031");
		expect(describeEstimate(undefined, PER_TOKEN)).toBe("unknown (from $30/M tok)");
	});
});
