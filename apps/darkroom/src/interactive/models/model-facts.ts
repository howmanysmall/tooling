import { toPlural } from "@howmanysmall/english-utilities/to-plural";

import { formatUnitPrice } from "$generation/cost-estimate";
import { getCountRange, getReferenceRange } from "$generation/model-capabilities";
import { describeListPrice, formatObservedPrice } from "$generation/observed-prices";
import { previewPrompt } from "$history/format-history";
import { describeMadeAt } from "$interactive/history/run-facts";

import { ExampleSource } from "./model-examples";

import type { CapabilityDescriptor, ImageModelListItem } from "@openrouter/sdk/models";

import type { ObservedPrice, PricingEntry } from "$generation/cost-estimate";
import type { ModelPrices } from "$generation/observed-prices";
import type { Fact } from "$interactive/components/fact";

import type { ModelExample } from "./model-examples";

export interface ModelNameParts {
	/** The model's own name, like `Nano Banana 2.1`. */
	readonly name: string;
	/** Who makes it, like `Google`, when the name says. */
	readonly provider?: string | undefined;
}

const PROVIDER_SEPARATOR = ": ";

const addedFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Splits OpenRouter's `Provider: Name` display name.
 *
 * @param displayName - Like `Google: Nano Banana 2.1`.
 * @returns The name and, when present, the provider.
 */
export function splitModelName(displayName: string): ModelNameParts {
	const separator = displayName.indexOf(PROVIDER_SEPARATOR);
	if (separator === -1) return { name: displayName };

	return {
		name: displayName.slice(separator + PROVIDER_SEPARATOR.length),
		provider: displayName.slice(0, separator),
	};
}

// Keeps a caption to about one line.
const CAPTION_PROMPT_LENGTH = 48;

/**
 * Captions an example image with whose it is, its prompt, and, when both
 * kinds exist, the key that switches to the other.
 *
 * @param example - The example shown.
 * @param now - The current time, for when you made yours.
 * @param canSwitch - Whether the model has both yours and a shipped one.
 * @returns Like `your latest · “a fox” · Today 09:41` or `example · “a fox”`.
 */
export function describeExampleCaption(example: ModelExample, now: Date, canSwitch: boolean): string {
	const prompt = `“${previewPrompt(example.prompt, CAPTION_PROMPT_LENGTH)}”`;
	const isYours = example.source === ExampleSource.Yours;
	const parts =
		isYours && example.created !== undefined
			? ["your latest", prompt, describeMadeAt(example.created, now)]
			: ["example", prompt];
	if (canSwitch) parts.push(isYours ? "e for the example" : "e for yours");

	return parts.join(" · ");
}

function describeLimit(max: number): string {
	return max === 0 ? "none" : `up to ${max}`;
}

/**
 * A model's headline facts, for the columns under its name.
 *
 * @param model - The image model.
 * @param prices - Its published and observed prices.
 * @returns Its price, reference and image limits, and when it was added.
 */
export function getModelStats(model: ImageModelListItem, prices: ModelPrices): Array<Fact> {
	return [
		{ label: "price", value: describeListPrice(prices) },
		{ label: "inputs", value: model.architecture.inputModalities.join(" · ") },
		{ label: "refs", value: describeLimit(getReferenceRange(model).max) },
		{ label: "images", value: describeLimit(getCountRange(model).max) },
		{ label: "streams", value: model.supportsStreaming ? "yes" : "no" },
		{ label: "added", value: addedFormatter.format(new Date(model.created * 1000)) },
	];
}

// Known options in the order to show them. The stats already cover `n` and
// `input_references`; anything else a model declares follows these.
const OPTION_ORDER: ReadonlyArray<readonly [parameter: string, label: string]> = [
	["aspect_ratio", "ratios"],
	["resolution", "resolutions"],
	["quality", "quality"],
	["background", "background"],
	["output_format", "formats"],
	["output_compression", "compression"],
	["seed", "seed"],
];
const OPTION_LABELS: ReadonlyMap<string, string> = new Map(OPTION_ORDER);
const IN_STATS: ReadonlySet<string> = new Set(["input_references", "n"]);

function describeOption(descriptor: CapabilityDescriptor): string {
	switch (descriptor.type) {
		case "enum":
			return descriptor.values.join("  ");
		case "range":
			return `${descriptor.min}–${descriptor.max}`;
		default:
			return "yes";
	}
}

function getOptionRank(parameter: string): number {
	const rank = OPTION_ORDER.findIndex(([known]) => known === parameter);
	return rank === -1 ? OPTION_ORDER.length : rank;
}

/**
 * Every option a model takes, one line each: its choices, its range, or
 * `yes` for switches like `seed`.
 *
 * @param model - The image model.
 * @returns Like `{ label: "ratios", value: "1:1  16:9  9:16" }`.
 */
export function getModelOptions(model: ImageModelListItem): Array<Fact> {
	return Object.entries(model.supportedParameters)
		.filter(([parameter]) => !IN_STATS.has(parameter))
		.toSorted(([first], [second]) => getOptionRank(first) - getOptionRank(second))
		.map(([parameter, descriptor]) => ({
			label: OPTION_LABELS.get(parameter) ?? parameter.replaceAll("_", " "),
			value: describeOption(descriptor),
		}));
}

const BILLABLE_LABELS: ReadonlyMap<string, string> = new Map([
	["input_font", "font"],
	["input_image", "input image"],
	["input_reference", "reference"],
	["input_text", "prompt"],
	["output_image", "output"],
]);

function describeBillable({ billable, variant }: PricingEntry): string {
	const label = BILLABLE_LABELS.get(billable) ?? billable.replaceAll("_", " ");
	return variant === undefined ? label : `${label} · ${variant}`;
}

function describePrice(entry: PricingEntry): string {
	return entry.costUsd === 0 ? "free" : formatUnitPrice(entry);
}

function describeObserved(observed: ObservedPrice): string {
	return `${formatObservedPrice(observed)} over ${observed.images} ${toPlural(observed.images, "image")}`;
}

/**
 * Every price a model's endpoints charge, then what it has cost in past
 * runs. When several providers serve the model, each line names its
 * provider.
 *
 * @param prices - The model's published and observed prices.
 * @param prices.endpoints - Its endpoints and their prices.
 * @param prices.observed - What it has cost per image before, if known.
 * @returns Like `{ label: "output · 2k", value: "$0.1/img" }`.
 */
export function getPriceLines({ endpoints, observed }: ModelPrices): Array<Fact> {
	const namesProvider = endpoints.length > 1;
	const lines = endpoints.flatMap(({ pricing, provider }) =>
		pricing.map((entry) => ({
			label: namesProvider ? `${provider} · ${describeBillable(entry)}` : describeBillable(entry),
			value: describePrice(entry),
		})),
	);
	if (observed !== undefined) lines.push({ label: "your runs", value: describeObserved(observed) });

	return lines;
}
