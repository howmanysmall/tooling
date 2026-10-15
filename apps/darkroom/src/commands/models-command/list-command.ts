import { stdout } from "node:process";
import { EnumType } from "@cliffy/command";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };

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

async function listModelsAsync(flags: ListFlags, search: string | undefined): Promise<void> {
	const [
		{ log },
		{ getImageModelsAsync },
		{ getModelPricingAsync },
		{ filterModels, sortModels },
		{ formatModelList },
	] = await Promise.all([
		import("$generation/cli-runner"),
		import("$utilities/image-model-utilities"),
		import("$utilities/model-pricing-utilities"),
		import("$utilities/model-filters"),
		import("$utilities/format-model-list"),
	]);
	const [models, pricing] = await Promise.all([
		getImageModelsAsync(),
		getModelPricingAsync(true, (message) => {
			log.warn(message);
		}),
	]);

	const filter: ModelFilter = { ...flags, search };
	const sort = isModelSort(flags.sort) ? flags.sort : ModelSort.Name;
	const shown = sortModels(filterModels(models, filter), sort, pricing);

	const output = formatModelList(shown, pricing, flags.format, stdout.isTTY);
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
	.option("-f, --format <format:output-format>", "The output format. Defaults to a table, or IDs when piped.")
	.action(async (flags, search) => listModelsAsync(flags, search));
