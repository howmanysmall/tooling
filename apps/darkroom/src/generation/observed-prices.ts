import { comparePrices, formatUnitPrice, getListPrice } from "./cost-estimate";

import type { HistoryEntry } from "$history/history-entry";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

import type { EndpointPricing, ObservedPrice } from "./cost-estimate";

/** Observed prices, keyed by model ID. */
export type ObservedPrices = ReadonlyMap<string, ObservedPrice>;

/** A model's published prices, and what it has cost in past runs. */
export interface ModelPrices {
	readonly endpoints: ReadonlyArray<EndpointPricing>;
	readonly observed?: ObservedPrice | undefined;
}

/** Shown where no price is known. */
export const UNKNOWN_PRICE = "—";

/**
 * Works out what each model has cost per image from the history. Token and
 * megapixel prices can't say what an image costs in advance, but every run
 * records what it was charged.
 *
 * @param entries - Past runs.
 * @returns The average cost per image of each model with a charged run.
 */
export function getObservedPrices(entries: ReadonlyArray<HistoryEntry>): Map<string, ObservedPrice> {
	const totals = new Map<string, { images: number; usd: number }>();
	for (const { cost, model, returned } of entries) {
		if (cost === undefined || returned === 0) continue;

		const total = totals.get(model) ?? { images: 0, usd: 0 };
		totals.set(model, { images: total.images + returned, usd: total.usd + cost });
	}

	const observed = new Map<string, ObservedPrice>();
	for (const [model, { images, usd }] of totals) {
		observed.set(model, { images, usdPerImage: usd / images });
	}

	return observed;
}

/**
 * The price per image to compare models by: the published one when the model
 * charges by the image, otherwise what it has cost in past runs.
 *
 * @param prices - The model's prices.
 * @param prices.endpoints - Its published prices.
 * @param prices.observed - What it has cost per image before, if known.
 * @returns US dollars per image, or `undefined` when it can't be known.
 */
export function getPerImagePrice({ endpoints, observed }: ModelPrices): number | undefined {
	const price = getListPrice(endpoints);
	return price?.unit === "image" ? price.costUsd : observed?.usdPerImage;
}

/**
 * Gathers one model's published and observed prices.
 *
 * @param pricing - Every model's published prices.
 * @param observed - Every model's observed prices, if read.
 * @param modelId - Which model to look up.
 * @returns Its prices.
 */
export function getModelPrices(
	pricing: ModelPricing,
	observed: ObservedPrices | undefined,
	modelId: string,
): ModelPrices {
	return { endpoints: pricing[modelId] ?? [], observed: observed?.get(modelId) };
}

/**
 * Orders models for `--sort price`: by price per image, published or from
 * past runs, then the rest by their published unit prices.
 *
 * @param first - One model's prices.
 * @param second - Another model's prices.
 * @returns A negative number when `first` sorts first.
 */
export function compareModelPrices(first: ModelPrices, second: ModelPrices): number {
	const firstPerImage = getPerImagePrice(first);
	const secondPerImage = getPerImagePrice(second);
	if (firstPerImage === undefined && secondPerImage === undefined) {
		return comparePrices(getListPrice(first.endpoints), getListPrice(second.endpoints));
	}

	return (firstPerImage ?? Number.POSITIVE_INFINITY) - (secondPerImage ?? Number.POSITIVE_INFINITY);
}

/**
 * Formats what a model has cost per image in past runs.
 *
 * @param observed - The model's observed price.
 * @returns Like `≈ $0.039/img`.
 */
export function formatObservedPrice(observed: ObservedPrice): string {
	return `≈ ${formatUnitPrice({ billable: "output_image", costUsd: observed.usdPerImage, unit: "image" })}`;
}

/**
 * The price to show beside a model in lists: the published price per image,
 * or an estimate from past runs when the model charges by the token or
 * megapixel.
 *
 * @param prices - The model's prices.
 * @param prices.endpoints - Its published prices.
 * @param prices.observed - What it has cost per image before, if known.
 * @returns Like `$0.039/img`, `≈ $0.039/img`, `$30/M tok`, or a dash.
 */
export function describeListPrice({ endpoints, observed }: ModelPrices): string {
	const price = getListPrice(endpoints);
	if (observed !== undefined && price?.unit !== "image") return formatObservedPrice(observed);

	return price === undefined ? UNKNOWN_PRICE : formatUnitPrice(price);
}
