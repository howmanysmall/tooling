import { Ansis } from "ansis";

import { BAR_WIDTH, COLUMN_GAP, GAP_TOTAL, GRAY, LABEL_WIDTH, RULE, SHARE_WIDTH } from "$constants/rendering-constants";
import { TableRowKind } from "$meta/table-row-kind";
import { getEighths, getPercent } from "$utilities/number-utilities";
import { getWidestWidth, groupDigits, padEnd, padStart, shorten } from "$utilities/string-utilities";

import { getBarParts } from "./get-bar-parts";
import { getLanguageColor } from "./get-language-color";

import type { Aggregate } from "$types/code-types";
import type { LanguageOwner, Paint, RenderOptions, RowStyle, TableRow } from "$types/rendering-types";

const keepText: Paint = function keepText(text): string {
	return text;
};

export function renderTable(aggregate: Aggregate, options: RenderOptions): string {
	const ansi = new Ansis(options.color ? 3 : 0);
	const gray = ansi.hex(GRAY);
	const rule = ansi.hex(RULE);

	const rows = createRows(aggregate, options.withLanguages);
	const labels = rows.map((row) => shorten(row.label, LABEL_WIDTH));
	const filesCells = rows.map((row) => groupDigits(row.files));
	const codeCells = rows.map((row) => groupDigits(row.code));
	const commentCells = rows.map((row) => groupDigits(row.comment));
	const blankCells = rows.map((row) => groupDigits(row.blank));
	const complexityCells = rows.map((row) => groupDigits(row.complexity));

	const nameWidth = getWidestWidth("PROJECT", labels);
	const filesWidth = getWidestWidth("FILES", filesCells);
	const codeWidth = getWidestWidth("CODE", codeCells);
	const commentWidth = getWidestWidth("COMMENT", commentCells);
	const blankWidth = getWidestWidth("BLANK", blankCells);
	const complexityWidth = getWidestWidth("COMPLEXITY", complexityCells);
	const topWidth = getWidestWidth(
		"TOP LANGUAGE",
		rows.map((row) => row.top ?? ""),
	);
	const ruleLine = rule(
		"─".repeat(
			nameWidth +
				filesWidth +
				codeWidth +
				commentWidth +
				blankWidth +
				complexityWidth +
				SHARE_WIDTH +
				topWidth +
				GAP_TOTAL,
		),
	);

	const header = gray.bold;
	const lines = [
		[
			header(padEnd("PROJECT", nameWidth)),
			header(padStart("FILES", filesWidth)),
			header(padStart("CODE", codeWidth)),
			header(padStart("COMMENT", commentWidth)),
			header(padStart("BLANK", blankWidth)),
			header(padStart("COMPLEXITY", complexityWidth)),
			header(padEnd("SHARE", SHARE_WIDTH)),
			header("TOP LANGUAGE"),
		].join(COLUMN_GAP),
		ruleLine,
	];

	for (const [index, row] of rows.entries()) {
		const style = createRowStyle(ansi, row);

		if (row.kind === TableRowKind.Total) {
			lines.push(ruleLine);
		}

		const padded = padEnd(labels[index] ?? row.label, nameWidth);
		// A language row keeps its tree glyph in the rule color and paints only
		// the name.
		const nameCell =
			row.kind === TableRowKind.Language
				? rule(padded.slice(0, 4)) + style.name(padded.slice(4))
				: style.name(padded);
		const bar = getBarParts(row.eighths, BAR_WIDTH);
		const percent = `${row.percent.toFixed(1).padStart(5, " ")}%`;

		const cells = [
			nameCell,
			style.files(padStart(filesCells[index] ?? "", filesWidth)),
			style.code(padStart(codeCells[index] ?? "", codeWidth)),
			style.comment(padStart(commentCells[index] ?? "", commentWidth)),
			style.blank(padStart(blankCells[index] ?? "", blankWidth)),
			style.complexity(padStart(complexityCells[index] ?? "", complexityWidth)),
			`${style.bar(bar.filled)}${rule(bar.track)} ${gray(percent)}`,
		];

		if (style.top !== undefined) {
			cells.push(style.top(row.top ?? "-"));
		}

		lines.push(cells.join(COLUMN_GAP));
	}

	return lines.join("\n");
}

function addLanguageRows(rows: Array<TableRow>, languageOwner: LanguageOwner): void {
	const lastIndex = languageOwner.languages.length - 1;

	for (const [index, language] of languageOwner.languages.entries()) {
		rows.push({
			blank: language.blank,
			code: language.code,
			comment: language.comment,
			complexity: language.complexity,
			eighths: getEighths(language.code, languageOwner.code),
			files: language.files,
			kind: TableRowKind.Language,
			label: `  ${index === lastIndex ? "└" : "├"} ${language.name}`,
			language: language.name,
			percent: getPercent(language.code, languageOwner.code),
			top: undefined,
		});
	}
}

function createRows({ projects, total }: Aggregate, withLanguages: boolean): Array<TableRow> {
	const whole = total.code;
	let largest = 0;
	for (const project of projects) {
		largest = Math.max(largest, project.code);
	}

	const rows = new Array<TableRow>();
	for (const project of projects) {
		rows.push({
			blank: project.blank,
			code: project.code,
			comment: project.comment,
			complexity: project.complexity,
			eighths: getEighths(project.code, largest),
			files: project.files,
			kind: TableRowKind.Project,
			label: project.name,
			language: undefined,
			percent: getPercent(project.code, whole),
			top: project.languages[0]?.name,
		});

		if (withLanguages) {
			addLanguageRows(rows, project);
		}
	}

	rows.push({
		blank: total.blank,
		code: total.code,
		comment: total.comment,
		complexity: total.complexity,
		eighths: getEighths(whole, whole),
		files: total.files,
		kind: TableRowKind.Total,
		label: `Total (${total.projects} ${total.projects === 1 ? "project" : "projects"})`,
		language: undefined,
		percent: getPercent(whole, whole),
		top: total.languages[0]?.name,
	});

	if (withLanguages) {
		addLanguageRows(rows, total);
	}

	return rows;
}

function createRowStyle(ansi: Ansis, row: TableRow): RowStyle {
	const gray = ansi.hex(GRAY);

	if (row.kind === TableRowKind.Language) {
		const color = ansi.hex(getLanguageColor(row.language ?? ""));
		return {
			name: color,
			bar: color,
			blank: gray,
			code: ansi.green,
			comment: ansi.blue,
			complexity: gray,
			files: gray,
			top: undefined,
		};
	}

	if (row.kind === TableRowKind.Project) {
		const color = ansi.hex(getLanguageColor(row.top ?? "-"));
		return {
			name: ansi.whiteBright.bold,
			bar: color,
			blank: gray,
			code: ansi.greenBright,
			comment: ansi.blueBright,
			complexity: ansi.yellow,
			files: keepText,
			top: color,
		};
	}

	return {
		name: ansi.cyanBright.bold,
		bar: ansi.cyanBright,
		blank: gray.bold,
		code: ansi.greenBright.bold,
		comment: ansi.blueBright.bold,
		complexity: ansi.yellow.bold,
		files: ansi.white.bold,
		top: ansi.hex(getLanguageColor(row.top ?? "-")),
	};
}
