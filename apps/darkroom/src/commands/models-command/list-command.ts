import { stdin, stdout } from "node:process";
import { EnumType } from "@cliffy/command";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

import { AppTab } from "$interactive/app-tab";
import { ModelSort } from "$utilities/model-filters";
import { aspectRatioType, getAspectRatiosAsync } from "$validators/aspect-ratio-type";
import { getProvidersAsync } from "$validators/image-model-id-type";
import { outputFormatType } from "$validators/output-format-type";

import type { ModelFilter } from "$utilities/model-filters";
import type { OutputFormat } from "$validators/output-format-type";

const scriptName = getScriptName(true);

const SORTS: ReadonlySet<string> = new Set(["created", "name", "price"]);
const sortType = new EnumType([...SORTS]);

function isModelSort(value: string): value is ModelSort {
	return SORTS.has(value);
}

interface ListFlags {
	readonly format?: OutputFormat | undefined;
	readonly multi?: true | undefined;
	readonly provider?: string | undefined;
	readonly ratio?: string | undefined;
	readonly refs?: true | undefined;
	readonly sort: string;
	readonly transparent?: true | undefined;
}

/**
 * Whether to open the full-screen browser: without `--format`, when a person
 * is at a terminal.
 *
 * @param format - The `--format` value, if given.
 * @returns `true` to browse, `false` to print.
 */
function wantsBrowser(format?: OutputFormat): boolean {
	return format === undefined && stdin.isTTY && stdout.isTTY;
}

async function listModelsAsync(flags: ListFlags, search: string | undefined): Promise<void> {
	const [
		{ log, readHistoryQuietlyAsync },
		{ getImageModelsAsync },
		{ getModelPricingAsync },
		{ filterModels, sortModels },
		{ formatModelList },
		{ getObservedPrices },
	] = await Promise.all([
		import("$generation/cli-runner"),
		import("$utilities/image-model-utilities"),
		import("$utilities/model-pricing-utilities"),
		import("$utilities/model-filters"),
		import("$utilities/format-model-list"),
		import("$generation/observed-prices"),
	]);
	const [models, pricing, history] = await Promise.all([
		getImageModelsAsync(),
		getModelPricingAsync(true, (message) => {
			log.warn(message);
		}),
		readHistoryQuietlyAsync(),
	]);

	const observed = getObservedPrices(history);
	const filter: ModelFilter = { ...flags, search };
	const sort = isModelSort(flags.sort) ? flags.sort : ModelSort.Name;
	const shown = sortModels(filterModels(models, filter), sort, pricing, observed);

	if (wantsBrowser(flags.format)) {
		// React and Ink only load for the browser.
		const { openDarkroomAsync } = await import("$interactive/open-darkroom");
		await openDarkroomAsync({ models: { models: shown, observed, pricing }, sort, tab: AppTab.Models });
		return;
	}

	const output = formatModelList(shown, pricing, flags.format, stdout.isTTY, observed);
	if (output !== "") console.log(output);
}

export const listCommand = createBaseCommand(scriptName, "1.0.0", "List and filter image models.")
	.type("aspect-ratio", aspectRatioType)
	.complete("aspect-ratio", getAspectRatiosAsync)
	.type("output-format", outputFormatType)
	.type("model-sort", sortType)
	.complete("provider", getProvidersAsync)
	.arguments("[search:string]")
	.option("--provider <name:string:provider>", "Only models from this provider, like google.")
	.option("--refs", "Only models that accept reference images.")
	.option("--multi", "Only models that can return several images per request.")
	.option("--ratio <ratio:aspect-ratio>", "Only models that accept this aspect ratio.")
	.option("--transparent", "Only models that can make a transparent background.")
	.option("--sort <key:model-sort>", "Sort by name, price, or created.", { default: "name" })
	.option(
		"-f, --format <format:output-format>",
		"The output format. Defaults to a full-screen browser on a terminal, or IDs when piped.",
	)
	.action(async (flags, search) => listModelsAsync(flags, search));
