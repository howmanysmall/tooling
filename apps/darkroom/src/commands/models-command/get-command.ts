import { exit, stderr } from "node:process";
import { Table } from "@cliffy/table";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import { bold, cyan, dim, green, link, red, underline } from "ansis";
import { consola } from "consola";

import { formatTimestampAsync } from "$functions/format-timestamp";
import {
	formatJson,
	getLabelWidth,
	getOutputWidth,
	INDENT,
	renderRows,
	wrapText,
} from "$utilities/output-format-utilities";
import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";
import { TimestampFormat, timestampFormatType } from "$validators/timestamp-format-type";

import type { CapabilityDescriptor, ImageModelListItem } from "@openrouter/sdk/models";

import type { Row } from "$utilities/output-format-utilities";

const scriptName = getScriptName(true);

// Route every level to stderr so stdout only carries the requested output.
const log = consola.create({ stdout: stderr }).withTag(scriptName);

export const getCommand = createBaseCommand(scriptName, "1.1.0", "Used to acquire model information from OpenRouter.")
	.env("OPENROUTER_API_KEY=<value:string>", "The OpenRouter API key to use for generating images.", {})
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.type("output-format", outputFormatType)
	.type("timestamp-format", timestampFormatType)
	.option("--regenerate", "Regenerate the CLI completion cache before executing the command.")
	.option("-f, --format <format:output-format>", "The output format to use for the model information.", {
		default: OutputFormat.Pretty,
	})
	.option(
		"-t, --timestamp-format <format:timestamp-format>",
		"The timestamp format to use for the model information.",
		{
			default: TimestampFormat.ShortWeekdayDateTime,
		},
	)
	.argument("[model:image-model]", "The OpenRouter model to get information for.")
	.action(async ({ format: outputFormat, regenerate = false, timestampFormat }, model) => {
		log.info(
			model === undefined
				? "Getting information for all models..."
				: `Getting information for model ${bold.magenta(model)}...`,
		);

		const imageModels = await import("$utilities/image-model-utilities").then(async ({ getImageModelsAsync }) =>
			getImageModelsAsync(!regenerate),
		);

		if (model === undefined) {
			log.info(`Found ${bold.cyan(imageModels.length)} ${toPlural(imageModels.length, "model")}.`);
			console.log(await formatModelsAsync(imageModels, { outputFormat, timestampFormat }));
			return;
		}

		const imageModel = imageModels.find((item) => item.id === model);
		if (imageModel === undefined) {
			log.fail(`Could not find model ${bold.magenta(model)}.`);
			exit(1);
		}

		console.log(await formatModelAsync(imageModel, { outputFormat, timestampFormat }));
	});

const naturalCollator = new Intl.Collator(undefined, { numeric: true });
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function compareNatural(self: string, other: string): number {
	return naturalCollator.compare(self, other);
}

function formatNumber(value: number): string {
	return cyan(numberFormatter.format(value));
}

function formatList(values: ReadonlyArray<string>): string {
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- single parameter function
	return values.map(green).join(`${dim(",")} `);
}

function toPrettyCapabilityDescriptor(capabilityDescriptor: CapabilityDescriptor): string {
	switch (capabilityDescriptor.type) {
		case "boolean":
			return formatList(["true", "false"]);

		case "enum":
			return formatList(capabilityDescriptor.values.toSorted(compareNatural));

		case "range": {
			if (capabilityDescriptor.min === capabilityDescriptor.max) {
				return formatNumber(capabilityDescriptor.min);
			}

			return `${formatNumber(capabilityDescriptor.min)}${dim("–")}${formatNumber(capabilityDescriptor.max)}`;
		}

		case "UNKNOWN":
			return dim("unknown");

		default:
			throw new Error("Unknown capability descriptor type?");
	}
}

function toPrettyModalities(modalities: ReadonlyArray<string>): string {
	return modalities.length === 0 ? red("none?") : formatList(modalities);
}

const TRUNCATION_MARKER = "...";
const TRAILING_PUNCTUATION_PATTERN = /[,;:]$/u;

function toPrettyDescription(description: string): string {
	const trimmed = description.trim();
	if (!trimmed.endsWith(TRUNCATION_MARKER)) return trimmed;

	const withoutMarker = trimmed.slice(0, -TRUNCATION_MARKER.length).trimEnd();
	return `${withoutMarker.replace(TRAILING_PUNCTUATION_PATTERN, "")}…`;
}

function toModelPageLink(id: string): string {
	const url = `https://openrouter.ai/${encodeURI(id)}`;
	return underline(link(url, url));
}

interface PrettyObject {
	readonly id: string;
	readonly name: string;
	readonly architecture: {
		readonly inputModalities: string;
		readonly outputModalities: string;
	};
	readonly created: string;
	readonly description: string;
	readonly page: string;
	readonly supportedParameters: Record<string, string>;
}

function toPrettySupportedParameters(
	supportedParameters: ImageModelListItem["supportedParameters"],
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(supportedParameters).map(([key, value]) => [key, toPrettyCapabilityDescriptor(value)]),
	);
}

async function toPrettyObjectAsync(
	imageModelListItem: ImageModelListItem,
	timestampFormat = TimestampFormat.ShortWeekdayDateTime,
): Promise<PrettyObject> {
	return {
		id: imageModelListItem.id,
		name: imageModelListItem.name,
		architecture: {
			inputModalities: toPrettyModalities(imageModelListItem.architecture.inputModalities),
			outputModalities: toPrettyModalities(imageModelListItem.architecture.outputModalities),
		},
		created: await formatTimestampAsync(imageModelListItem.created, timestampFormat),
		description: toPrettyDescription(imageModelListItem.description),
		page: toModelPageLink(imageModelListItem.id),
		supportedParameters: toPrettySupportedParameters(imageModelListItem.supportedParameters),
	};
}

function toDetailRows(prettyObject: PrettyObject): Array<Row> {
	return [
		["created", prettyObject.created],
		["input", prettyObject.architecture.inputModalities],
		["output", prettyObject.architecture.outputModalities],
		["page", prettyObject.page],
	];
}

function renderPrettyObject(prettyObject: PrettyObject): string {
	const width = getOutputWidth();
	const detailRows = toDetailRows(prettyObject);
	const parameterRows = Object.entries(prettyObject.supportedParameters);
	const labelWidth = getLabelWidth([...detailRows, ...parameterRows]);

	const sections = [`${bold.magenta(prettyObject.id)}${dim(" · ")}${prettyObject.name}`];

	const description = wrapText(prettyObject.description, Math.max(40, width - INDENT.length));
	if (description.length > 0) sections.push(description.map((line) => `${INDENT}${line}`).join("\n"));

	sections.push(renderRows(detailRows, labelWidth, width));

	if (parameterRows.length > 0) {
		sections.push(`${INDENT}${bold("parameters")}\n${renderRows(parameterRows, labelWidth, width)}`);
	}

	return sections.join("\n\n");
}

async function formatModelPrettyAsync(
	imageModel: ImageModelListItem,
	timestampFormat: TimestampFormat,
): Promise<string> {
	return renderPrettyObject(await toPrettyObjectAsync(imageModel, timestampFormat));
}

async function formatModelTableAsync(
	imageModel: ImageModelListItem,
	timestampFormat: TimestampFormat,
): Promise<string> {
	const prettyObject = await toPrettyObjectAsync(imageModel, timestampFormat);
	const rows: Array<Row> = [
		["id", bold.magenta(prettyObject.id)],
		["name", prettyObject.name],
		...toDetailRows(prettyObject),
		["description", prettyObject.description],
		...Object.entries(prettyObject.supportedParameters),
	];

	const labelWidth = getLabelWidth(rows);
	const valueWidth = Math.max(30, getOutputWidth() - labelWidth - 7);
	return new Table()
		.maxColWidth([labelWidth, valueWidth])
		.body(rows.map(([label, value]) => [dim(label), value]))
		.border()
		.toString();
}

interface Formats {
	readonly outputFormat: OutputFormat;
	readonly timestampFormat: TimestampFormat;
}

async function formatModelAsync(
	imageModel: ImageModelListItem,
	{ outputFormat, timestampFormat }: Formats,
): Promise<string> {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified:
			return formatJson(imageModel, outputFormat);

		case OutputFormat.Pretty:
			return formatModelPrettyAsync(imageModel, timestampFormat);

		case OutputFormat.Table:
			return formatModelTableAsync(imageModel, timestampFormat);

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}

async function formatModelsAsync(
	imageModels: ReadonlyArray<ImageModelListItem>,
	{ outputFormat, timestampFormat }: Formats,
): Promise<string> {
	switch (outputFormat) {
		case OutputFormat.Json:
		case OutputFormat.JsonMinified:
			return formatJson(imageModels, outputFormat);

		case OutputFormat.Pretty: {
			const results = await Promise.all(
				imageModels.map(async (imageModel) => formatModelPrettyAsync(imageModel, timestampFormat)),
			);

			return results.join("\n\n");
		}

		case OutputFormat.Table: {
			const body = await Promise.all(
				imageModels.map(async (imageModel) => {
					const prettyObject = await toPrettyObjectAsync(imageModel, timestampFormat);
					return [
						bold.magenta(prettyObject.id),
						prettyObject.name,
						prettyObject.architecture.inputModalities,
						prettyObject.architecture.outputModalities,
						prettyObject.created,
					];
				}),
			);

			return new Table().header(["ID", "Name", "Input", "Output", "Created"]).body(body).border().toString();
		}

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}
