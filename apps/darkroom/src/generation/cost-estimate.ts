import type { PreparedGeneration } from "./run-generation";

/** One price from a model endpoint, as OpenRouter reports it. */
export interface PricingEntry {
	/** What is billed: `output_image`, `input_reference`, `input_image`, …. */
	readonly billable: string;
	readonly costUsd: number;
	/** `image`, `megapixel`, `token`, or `request`. */
	readonly unit: string;
	/** A tier the price applies to, such as `2k` or `low_1k`. */
	readonly variant?: string | undefined;
}

export interface EndpointPricing {
	readonly pricing: ReadonlyArray<PricingEntry>;
	readonly provider: string;
}

export interface EstimateRequest {
	readonly aspectRatio?: string | undefined;
	readonly count: number;
	readonly quality?: string | undefined;
	readonly referenceCount: number;
	readonly resolution?: string | undefined;
}

/**
 * Describes a prepared request the way the price tables need it.
 *
 * @param prepared - The validated request.
 * @param prepared.input - The prompt and references.
 * @param prepared.parameters - The validated settings.
 * @returns The count, size, and references being asked for.
 */
export function toEstimateRequest({ input, parameters }: PreparedGeneration): EstimateRequest {
	return {
		aspectRatio: parameters.aspectRatio,
		count: parameters.count,
		quality: parameters.quality,
		referenceCount: input.references.length,
		resolution: parameters.resolution,
	};
}

/** What a model has actually cost per image in past runs. */
export interface ObservedPrice {
	/** How many images the average covers. */
	readonly images: number;
	readonly usdPerImage: number;
}

export interface CostEstimate {
	/**
	 * Some charges (megapixel rounding, tokens) could not be computed exactly.
	 */
	readonly isApproximate: boolean;
	readonly provider: string;
	readonly usd: number;
}

const OUTPUT = "output_image";
const REFERENCE_BILLABLES: ReadonlySet<string> = new Set(["input_image", "input_reference"]);

/** Long-edge pixels for each resolution tier. */
const TIER_PIXELS: ReadonlyMap<string, number> = new Map([
	["1.5k", 1536],
	["1k", 1024],
	["2k", 2048],
	["4k", 4096],
	["512", 512],
	["768", 768],
]);

const RATIO_PATTERN = /^(?<width>\d+(?:\.\d+)?):(?<height>\d+(?:\.\d+)?)$/u;

/**
 * Works out an image's size from its resolution tier and aspect ratio. The
 * tier is taken as the long edge.
 *
 * @param resolution - A tier such as `2K`.
 * @param aspectRatio - A ratio such as `16:9`.
 * @returns The size in megapixels, or `undefined` when either is unknown or
 *   the ratio is `auto`.
 */
export function getMegapixels(resolution?: string, aspectRatio?: string): number | undefined {
	const longEdge = TIER_PIXELS.get(resolution?.toLowerCase() ?? "");
	const match = RATIO_PATTERN.exec(aspectRatio ?? "");
	if (longEdge === undefined || match === null) return undefined;

	const width = Number(match.groups?.width);
	const height = Number(match.groups?.height);
	if (width <= 0 || height <= 0) return undefined;

	const shortEdge = Math.round((longEdge * Math.min(width, height)) / Math.max(width, height));
	return (longEdge * shortEdge) / 1e6;
}

/**
 * Picks the output price that applies to a request: a variant matching the
 * quality and resolution, then one matching either, then the default.
 *
 * @param pricing - One endpoint's prices.
 * @param request - The count, quality, and resolution being asked for.
 * @returns The price, or `undefined` when none applies.
 */
function pickOutputPrice(pricing: ReadonlyArray<PricingEntry>, request: EstimateRequest): PricingEntry | undefined {
	const outputs = pricing.filter((entry) => entry.billable === OUTPUT);
	const quality = request.quality?.toLowerCase();
	const resolution = request.resolution?.toLowerCase();
	const wanted = [
		quality !== undefined && resolution !== undefined ? `${quality}_${resolution}` : "",
		resolution,
		quality,
	];

	for (const variant of wanted) {
		const match = outputs.find((entry) => variant !== undefined && entry.variant?.toLowerCase() === variant);
		if (match !== undefined) return match;
	}

	return outputs.find((entry) => entry.variant === undefined);
}

function getOutputCost(price: PricingEntry, request: EstimateRequest): number | undefined {
	if (price.unit === "image") return price.costUsd * request.count;
	if (price.unit === "request") return price.costUsd;

	const megapixels = getMegapixels(request.resolution, request.aspectRatio);
	if (megapixels !== undefined && price.unit === "megapixel") return price.costUsd * megapixels * request.count;

	return undefined;
}

interface ReferenceCost {
	readonly isApproximate: boolean;
	readonly usd: number;
}

function getReferenceCost(pricing: ReadonlyArray<PricingEntry>, referenceCount: number): ReferenceCost {
	let usd = 0;
	let isApproximate = false;
	if (referenceCount === 0) {
		return { isApproximate, usd };
	}

	for (const entry of pricing) {
		if (!REFERENCE_BILLABLES.has(entry.billable) || entry.variant !== undefined) continue;

		if (entry.unit === "image") {
			usd += entry.costUsd * referenceCount;
		} else if (entry.unit === "request") {
			usd += entry.costUsd;
		} else {
			isApproximate = true;
		}
	}

	return { isApproximate, usd };
}

function getEndpointEstimate(endpoint: EndpointPricing, request: EstimateRequest): CostEstimate | undefined {
	const price = pickOutputPrice(endpoint.pricing, request);
	const outputCost = price === undefined ? undefined : getOutputCost(price, request);
	if (price === undefined || outputCost === undefined) return undefined;

	const references = getReferenceCost(endpoint.pricing, request.referenceCount);
	const hasTokenCharges = endpoint.pricing.some((entry) => entry.unit === "token");
	return {
		isApproximate: price.unit === "megapixel" || references.isApproximate || hasTokenCharges,
		provider: endpoint.provider,
		usd: outputCost + references.usd,
	};
}

/** The `provider` of an estimate made from past runs. */
export const PAST_RUNS = "past runs";

/**
 * Estimates what a request will cost on the cheapest endpoint that can price
 * it. When no published price can (token pricing, or a megapixel price
 * without a known size), the model's average from past runs stands in.
 *
 * @param endpoints - The model's endpoints and their prices.
 * @param request - The count, size, and references being asked for.
 * @param observed - What the model has cost per image before, if known.
 * @returns The estimate, or `undefined` when nothing can price it.
 */
export function getCostEstimate(
	endpoints: ReadonlyArray<EndpointPricing>,
	request: EstimateRequest,
	observed?: ObservedPrice,
): CostEstimate | undefined {
	let cheapest: CostEstimate | undefined;
	for (const endpoint of endpoints) {
		const estimate = getEndpointEstimate(endpoint, request);
		if (estimate !== undefined && (cheapest === undefined || estimate.usd < cheapest.usd)) {
			cheapest = estimate;
		}
	}

	if (cheapest !== undefined || observed === undefined) return cheapest;

	return { isApproximate: true, provider: PAST_RUNS, usd: observed.usdPerImage * request.count };
}

const UNIT_LABELS: ReadonlyMap<string, string> = new Map([
	["image", "img"],
	["megapixel", "MP"],
	["request", "req"],
]);

const priceFormatter = new Intl.NumberFormat("en-US", {
	currency: "USD",
	maximumSignificantDigits: 3,
	style: "currency",
});

/**
 * Formats a price per unit, like `$0.039/img`, `$0.02/MP`, or `$30/M tok`.
 *
 * @param entry - A price.
 * @returns The formatted price.
 */
export function formatUnitPrice(entry: PricingEntry): string {
	if (entry.unit === "token") return `${priceFormatter.format(entry.costUsd * 1e6)}/M tok`;

	return `${priceFormatter.format(entry.costUsd)}/${UNIT_LABELS.get(entry.unit) ?? entry.unit}`;
}

/**
 * Gets the price to show for a model in lists: the cheapest default output
 * price across its endpoints, or the cheapest variant when there is no
 * default.
 *
 * @param endpoints - The model's endpoints and their prices.
 * @returns The price, or `undefined` when the model has no output price.
 */
export function getListPrice(endpoints: ReadonlyArray<EndpointPricing>): PricingEntry | undefined {
	const outputs = endpoints.flatMap((endpoint) => endpoint.pricing.filter((entry) => entry.billable === OUTPUT));
	const defaults = outputs.filter((entry) => entry.variant === undefined);
	const candidates = defaults.length > 0 ? defaults : outputs;
	return candidates.toSorted((first, second) => first.costUsd - second.costUsd)[0];
}

const UNIT_ORDER: ReadonlyArray<string> = ["image", "request", "megapixel", "token"];

function getUnitRank(entry?: PricingEntry): number {
	if (entry === undefined) return UNIT_ORDER.length + 1;

	const rank = UNIT_ORDER.indexOf(entry.unit);
	return rank === -1 ? UNIT_ORDER.length : rank;
}

/**
 * Orders prices for `--sort price`: per-image prices first, then the other
 * units grouped by unit, cheapest first within each group, unknown last.
 *
 * @param first - One model's list price.
 * @param second - Another model's list price.
 * @returns A negative number when `first` sorts first.
 */
export function comparePrices(first?: PricingEntry, second?: PricingEntry): number {
	const byUnit = getUnitRank(first) - getUnitRank(second);
	if (byUnit !== 0) return byUnit;

	return (first?.costUsd ?? 0) - (second?.costUsd ?? 0);
}

function describeAmount({ isApproximate, provider, usd }: CostEstimate): string {
	const amount = priceFormatter.format(usd);
	if (provider === PAST_RUNS) return `≈ ${amount} (from past runs)`;

	return isApproximate ? `≈ ${amount}` : amount;
}

/**
 * Describes an estimate for people, like `$0.08`, `≈ $0.08`,
 * `≈ $0.08 (from past runs)`, or `unknown (from $30/M tok)`.
 *
 * @param estimate - The estimate, if one could be made.
 * @param endpoints - The model's prices, to show a unit price instead.
 * @returns The text.
 */
export function describeEstimate(
	estimate: CostEstimate | undefined,
	endpoints: ReadonlyArray<EndpointPricing>,
): string {
	if (estimate !== undefined) return describeAmount(estimate);

	const price = getListPrice(endpoints);
	return price === undefined ? "unknown" : `unknown (from ${formatUnitPrice(price)})`;
}
