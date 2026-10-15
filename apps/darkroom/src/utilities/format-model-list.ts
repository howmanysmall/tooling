import { Table } from "@cliffy/table";

import { formatUnitPrice, getListPrice } from "$generation/cost-estimate";
import { getCountRange, getReferenceRange } from "$generation/model-capabilities";
import { OutputFormat } from "$validators/output-format-type";

import { formatJson, trimTrailingSpaces } from "./output-format-utilities";

import type { ImageModelListItem } from "@openrouter/sdk/models";

import type { ModelPricing } from "./model-pricing-utilities";

function toRow(model: ImageModelListItem, pricing: ModelPricing): Array<string> {
	const price = getListPrice(pricing[model.id] ?? []);
	const references = getReferenceRange(model).max;
	const count = getCountRange(model).max;
	return [
		model.id,
		model.name,
		price === undefined ? "?" : formatUnitPrice(price),
		references === 0 ? "-" : `≤${references}`,
		`≤${count}`,
	];
}

const HEADER = ["ID", "Name", "Price", "Refs", "Count"];

/**
 * Formats models for `models list`.
 *
 * @param models - The models, already filtered and sorted.
 * @param pricing - Every model's prices.
 * @param format - The `--format` value, if given.
 * @param isTerminal - Whether stdout is a terminal. Without `--format`, a
 *   terminal gets a table and a pipe gets one ID per line.
 * @returns The text to print.
 */
export function formatModelList(
	models: ReadonlyArray<ImageModelListItem>,
	pricing: ModelPricing,
	format: OutputFormat | undefined,
	isTerminal: boolean,
): string {
	if (format === undefined && !isTerminal) return models.map((model) => model.id).join("\n");
	const rows = models.map((model) => toRow(model, pricing));
	const outputFormat = format ?? OutputFormat.Table;
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified: {
			return formatJson(
				models.map((model) => ({ ...model, pricing: pricing[model.id] ?? [] })),
				outputFormat,
			);
		}

		case OutputFormat.Pretty:
			return trimTrailingSpaces(new Table().header(HEADER).body(rows).padding(2).toString());

		case OutputFormat.Table:
			return new Table().header(HEADER).body(rows).border().toString();

		default:
			// eslint-disable-next-line unicorn/no-useless-coercion -- useless rule!
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}
