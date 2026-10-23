import { stdout } from "node:process";
import ansis, { dim } from "ansis";
import { String as EffectString } from "effect";

import { OutputFormat } from "$validators/output-format-type";

export type Row = readonly [label: string, value: string];

const MAX_WIDTH = 100;
const INDENT = "  ";
const GAP = "  ";
const WHITESPACE_PATTERN = /\s+/u;

/**
 * Serializes a value for `--format json` or `--format json-minified`.
 *
 * @param value - Any JSON-serializable data.
 * @param outputFormat - Which JSON flavor.
 * @returns Tab-indented JSON, or one line for `json-minified`.
 */
// oxlint-disable-next-line small-rules/no-object-parameters -- serializes whatever a command prints
export function formatJson(value: object, outputFormat: OutputFormat.Json | OutputFormat.JsonMinified): string {
	return outputFormat === OutputFormat.Json ? JSON.stringify(value, undefined, "\t") : JSON.stringify(value);
}

export function getOutputWidth(): number {
	return stdout.isTTY ? Math.min(stdout.columns, MAX_WIDTH) : MAX_WIDTH;
}

export function getLabelWidth(rows: ReadonlyArray<Row>): number {
	let labelWidth = 0;
	for (const [label] of rows) labelWidth = Math.max(labelWidth, label.length);

	return labelWidth;
}

export function wrapText(text: string, width: number): Array<string> {
	const lines: Array<string> = [];
	let line = "";
	let lineWidth = 0;
	for (const word of text.split(WHITESPACE_PATTERN)) {
		const wordWidth = ansis.strip(word).length;
		if (line.length === 0) {
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

export function renderRows(rows: ReadonlyArray<Row>, labelWidth: number, width: number): string {
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

export { INDENT };

/**
 * Renders a borderless table without the padding cliffy leaves at the end of
 * each line.
 *
 * @param table - The rendered table.
 * @returns The table with trailing spaces removed.
 */
export function trimTrailingSpaces(table: string): string {
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- single parameter function
	return table.split("\n").map(EffectString.trimEnd).join("\n");
}
