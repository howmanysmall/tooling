import { exit, stderr, stdout } from "node:process";
import { Table } from "@cliffy/table";
import { createBaseCommand } from "@howmanysmall/cli-utilities/create-base-command";
import { getScriptName } from "@howmanysmall/cli-utilities/get-script-name" with { type: "macro" };
import { toPlural } from "@howmanysmall/english-utilities/to-plural";
import ansis, { bold, cyan, dim, green, link, red, underline } from "ansis";
import { consola } from "consola";

import { formatTimestampAsync } from "$functions/format-timestamp";
import { getImageModelIdsAsync, imageModelIdType } from "$validators/image-model-id-type";
import { OutputFormat, outputFormatType } from "$validators/output-format-type";
import { TimestampFormat } from "$validators/timestamp-format-type";

import type { CapabilityDescriptor, ImageModelListItem } from "@openrouter/sdk/models";

const scriptName = getScriptName(true);
// Route every level to stderr so stdout only carries the requested output.
const log = consola.create({ stdout: stderr }).withTag(scriptName);

const naturalCollator = new Intl.Collator(undefined, { numeric: true });
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function compareNatural(self: string, other: string): number {
	return naturalCollator.compare(self, other);
}
function formatNumber(value: number): string {
	return cyan(numberFormatter.format(value));
}
function formatList(values: ReadonlyArray<string>): string {
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

async function toPrettyObjectAsync(imageModelListItem: ImageModelListItem): Promise<PrettyObject> {
	return {
		id: imageModelListItem.id,
		name: imageModelListItem.name,
		architecture: {
			inputModalities: toPrettyModalities(imageModelListItem.architecture.inputModalities),
			outputModalities: toPrettyModalities(imageModelListItem.architecture.outputModalities),
		},
		created: await formatTimestampAsync(imageModelListItem.created, TimestampFormat.ShortWeekdayDateTime),
		description: toPrettyDescription(imageModelListItem.description),
		page: toModelPageLink(imageModelListItem.id),
		supportedParameters: toPrettySupportedParameters(imageModelListItem.supportedParameters),
	};
}

type Row = readonly [label: string, value: string];

function toDetailRows(prettyObject: PrettyObject): Array<Row> {
	return [
		["created", prettyObject.created],
		["input", prettyObject.architecture.inputModalities],
		["output", prettyObject.architecture.outputModalities],
		["page", prettyObject.page],
	];
}

const MAX_WIDTH = 100;
const INDENT = "  ";
const GAP = "  ";
const WHITESPACE_PATTERN = /\s+/u;

function getOutputWidth(): number {
	return stdout.isTTY ? Math.min(stdout.columns, MAX_WIDTH) : MAX_WIDTH;
}

function getLabelWidth(rows: ReadonlyArray<Row>): number {
	let labelWidth = 0;
	for (const [label] of rows) labelWidth = Math.max(labelWidth, label.length);
	return labelWidth;
}

function wrapText(text: string, width: number): Array<string> {
	const lines: Array<string> = [];
	let line = "";
	let lineWidth = 0;
	for (const word of text.split(WHITESPACE_PATTERN)) {
		const wordWidth = ansis.strip(word).length;
		if (line === "") {
			line = word;
			lineWidth = wordWidth;
		} else if (lineWidth + 1 + wordWidth > width) {
			lines.push(line);
			line = word;
			lineWidth = wordWidth;
		} else {
			line += ` ${word}`;
			lineWidth += 1 + wordWidth;
		}
	}

	if (line.length > 0) lines.push(line);
	return lines;
}

function renderRows(rows: ReadonlyArray<Row>, labelWidth: number, width: number): string {
	const valueWidth = Math.max(20, width - INDENT.length - labelWidth - GAP.length);
	const hangingIndent = " ".repeat(INDENT.length + labelWidth + GAP.length);
	return rows
		.flatMap(([label, value]) => {
			const [first = "", ...rest] = wrapText(value, valueWidth);
			return [
				`${INDENT}${dim(label.padEnd(labelWidth))}${GAP}${first}`,
				...rest.map((line) => `${hangingIndent}${line}`),
			];
		})
		.join("\n");
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

async function formatModelPrettyAsync(imageModel: ImageModelListItem): Promise<string> {
	return renderPrettyObject(await toPrettyObjectAsync(imageModel));
}

async function formatModelTableAsync(imageModel: ImageModelListItem): Promise<string> {
	const prettyObject = await toPrettyObjectAsync(imageModel);
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

async function formatModelAsync(imageModel: ImageModelListItem, outputFormat: OutputFormat): Promise<string> {
	switch (outputFormat) {
		case OutputFormat.Json:
			return JSON.stringify(imageModel, undefined, "\t");

		case OutputFormat.JsonMinified:
			return JSON.stringify(imageModel);

		case OutputFormat.Pretty:
			return formatModelPrettyAsync(imageModel);

		case OutputFormat.Table:
			return formatModelTableAsync(imageModel);

		default:
			throw new Error(`Unknown output format: ${String(outputFormat)}`);
	}
}

async function formatModelsAsync(
	imageModels: ReadonlyArray<ImageModelListItem>,
	outputFormat: OutputFormat,
): Promise<string> {
	switch (outputFormat) {
		case OutputFormat.Json:
			return JSON.stringify(imageModels, undefined, "\t");

		case OutputFormat.JsonMinified:
			return JSON.stringify(imageModels);

		case OutputFormat.Pretty: {
			const results = await Promise.all(imageModels.map(formatModelPrettyAsync));
			return results.join("\n\n");
		}

		case OutputFormat.Table: {
			const body = await Promise.all(
				imageModels.map(async (imageModel) => {
					const prettyObject = await toPrettyObjectAsync(imageModel);
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

export const getCommand = createBaseCommand(scriptName, "1.0.0", "Used to acquire model information from OpenRouter.")
	.env("OPENROUTER_API_KEY=<value:string>", "The OpenRouter API key to use for generating images.", {})
	.type("image-model", imageModelIdType)
	.complete("image-model", getImageModelIdsAsync)
	.type("output-format", outputFormatType)
	.option("--regenerate", "Regenerate the CLI completion cache before executing the command.")
	.option("--format <type:output-format>", "The output format to use for the model information.", {
		default: OutputFormat.Pretty,
	})
	.argument("[model:image-model]", "The OpenRouter model to get information for.")
	.action(async ({ format, regenerate = false }, model) => {
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
			console.log(await formatModelsAsync(imageModels, format));
			return;
		}

		const imageModel = imageModels.find((item) => item.id === model);
		if (imageModel === undefined) {
			log.fail(`Could not find model ${bold.magenta(model)}.`);
			exit(1);
		}

		console.log(await formatModelAsync(imageModel, format));
	});
