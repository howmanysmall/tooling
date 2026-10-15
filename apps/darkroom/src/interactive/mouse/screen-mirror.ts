import { Writable } from "node:stream";
import xterm from "@xterm/headless";

import { CellKind, findTextRuns, getCellKind } from "./text-runs";

import type { IBufferCell } from "@xterm/headless";

import type { SelectionSpan, TextSelectionScreen } from "./text-selection";

export interface ScreenMirror extends TextSelectionScreen {
	/** Stops following the terminal's size. */
	readonly dispose: () => void;
	/** Calls `listener` after each write has reached the terminal. */
	readonly onWrite: (listener: () => void) => void;
	/** The output for Ink, which also feeds the mirror. */
	readonly stream: NodeJS.WriteStream;
}

const SAVE_CURSOR = "\u001B7";
const RESTORE_CURSOR = "\u001B8";
const RESET = "\u001B[0m";

function toRgbCodes(color: number): string {
	return `2;${(color >> 16) & 0xff};${(color >> 8) & 0xff};${color & 0xff}`;
}

function getForeground(cell: IBufferCell): string {
	if (cell.isFgRGB()) return `38;${toRgbCodes(cell.getFgColor())}`;
	return cell.isFgPalette() ? `38;5;${cell.getFgColor()}` : "39";
}

function getBackground(cell: IBufferCell): string {
	if (cell.isBgRGB()) return `48;${toRgbCodes(cell.getBgColor())}`;
	return cell.isBgPalette() ? `48;5;${cell.getBgColor()}` : "49";
}

/**
 * Builds the escape sequence that draws a cell the way it was drawn, or
 * on a highlight color instead of its own background.
 *
 * @param cell - A cell of the mirrored screen.
 * @param highlight - `0xRRGGBB` to draw it on, or `undefined` for its own.
 * @returns An SGR sequence that starts from a reset.
 */
export function describeCellStyle(cell: IBufferCell, highlight: number | undefined): string {
	const codes = ["0"];
	if (cell.isBold() !== 0) codes.push("1");
	if (cell.isDim() !== 0) codes.push("2");
	if (cell.isItalic() !== 0) codes.push("3");
	if (cell.isUnderline() !== 0) codes.push("4");
	if (cell.isStrikethrough() !== 0) codes.push("9");
	codes.push(getForeground(cell), highlight === undefined ? getBackground(cell) : `48;${toRgbCodes(highlight)}`);
	return `\u001B[${codes.join(";")}m`;
}

/**
 * Keeps a copy of what Ink draws, so text can be read back from the screen
 * and redrawn highlighted, the way a terminal shows a selection. Writes go
 * to the terminal at once, in order; the copy follows a moment later.
 *
 * @param output - The terminal.
 * @param highlight - The selection color, as `0xRRGGBB`.
 * @returns The stream for Ink, and what reads and paints the screen.
 */
export function createScreenMirror(output: NodeJS.WriteStream, highlight: number): ScreenMirror {
	const terminal = new xterm.Terminal({
		allowProposedApi: true,
		cols: output.columns,
		// The terminal turns Ink's bare newlines into a new line at the left.
		convertEol: true,
		rows: output.rows,
		scrollback: 0,
	});
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	const stream = new Writable({
		decodeStrings: false,
		write(chunk: Buffer | string, _encoding, callback): void {
			output.write(chunk);
			terminal.write(chunk, notify);
			callback();
		},
	});
	Object.defineProperties(stream, {
		columns: { get: (): number => output.columns },
		isTTY: { value: true },
		rows: { get: (): number => output.rows },
	});

	function onResize(): void {
		terminal.resize(output.columns, output.rows);
		stream.emit("resize");
	}
	output.on("resize", onResize);

	function drawSpan({ end, row, start }: SelectionSpan, isHighlighted: boolean): string {
		const line = terminal.buffer.active.getLine(row);
		if (line === undefined) return "";

		let drawn = `\u001B[${row + 1};${start + 1}H`;
		for (let column = start; column < end; column += 1) {
			const cell = line.getCell(column);
			// The right half of a wide character is drawn with its left half.
			if (cell !== undefined && cell.getWidth() > 0) {
				drawn += describeCellStyle(cell, isHighlighted ? highlight : undefined) + (cell.getChars() || " ");
			}
		}
		return drawn;
	}

	return {
		dispose(): void {
			output.off("resize", onResize);
			listeners.clear();
			terminal.dispose();
		},
		findText(spans): Array<SelectionSpan> {
			return spans.flatMap((span) => {
				const line = terminal.buffer.active.getLine(span.row);
				if (line === undefined) return [];

				return findTextRuns(span, (column) => {
					const cell = line.getCell(column);
					return cell === undefined ? CellKind.Blank : getCellKind(cell.getChars(), cell.getWidth());
				});
			});
		},
		getColumns: (): number => terminal.cols,
		onWrite(listener): void {
			listeners.add(listener);
		},
		paint(spans, isHighlighted): void {
			if (spans.length === 0) return;

			let drawn = SAVE_CURSOR;
			for (const span of spans) drawn += drawSpan(span, isHighlighted);
			output.write(`${drawn}${RESET}${RESTORE_CURSOR}`);
		},
		readText(runs): string {
			let text = "";
			let previous: SelectionSpan | undefined;
			for (const { end, row, start } of runs) {
				// Runs on a row keep their gap, and rows keep blank lines.
				if (previous?.row === row) text += " ".repeat(start - previous.end);
				else if (previous !== undefined) text += "\n".repeat(row - previous.row);
				text += terminal.buffer.active.getLine(row)?.translateToString(false, start, end) ?? "";
				previous = { end, row, start };
			}
			return text;
		},
		// SAFETY: it has every member Ink uses on stdout, defined above.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see the SAFETY comment
		stream: stream as NodeJS.WriteStream,
	};
}
