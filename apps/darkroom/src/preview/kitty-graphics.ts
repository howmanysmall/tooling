import { ROW_COLUMN_DIACRITICS } from "./row-column-diacritics";

import type { CellBox } from "./cell-fit";

const ESC = "\u001B";
const PLACEHOLDER = "\u{10EEEE}";
const CHUNK_LENGTH = 4096;

function formatCommand(control: string, payload = ""): string {
	const data = payload.length === 0 ? "" : `;${payload}`;
	return `${ESC}_G${control}${data}${ESC}\\`;
}

function splitChunks(data: string): Array<string> {
	const chunks: Array<string> = [];
	for (let offset = 0; offset < data.length; offset += CHUNK_LENGTH) {
		chunks.push(data.slice(offset, offset + CHUNK_LENGTH));
	}
	return chunks;
}

/**
 * Sends a PNG to the terminal as a virtual placement: nothing is drawn until
 * placeholder cells with its ID are printed. `q=2` keeps the terminal from
 * answering, so no reply lands in the input.
 *
 * @param id - The image ID, 1 to 2^24 - 1.
 * @param png - The PNG bytes.
 * @param cells - The cells the image is scaled to.
 * @returns The escape sequences, in 4096-byte chunks.
 */
export function formatKittyTransmit(id: number, png: Uint8Array, cells: CellBox): string {
	const chunks = splitChunks(Buffer.from(png).toString("base64"));
	return chunks
		.map((chunk, index) => {
			const more = index < chunks.length - 1 ? 1 : 0;
			const control =
				index === 0
					? `a=T,f=100,t=d,U=1,q=2,i=${id},c=${cells.columns},r=${cells.rows},m=${more}`
					: `m=${more}`;
			return formatCommand(control, chunk);
		})
		.join("");
}

function getDiacritic(index: number): string {
	return String.fromCodePoint(ROW_COLUMN_DIACRITICS[index] ?? ROW_COLUMN_DIACRITICS[0] ?? 0);
}

/**
 * Builds the text that shows a transmitted image: one placeholder per cell,
 * colored with the image ID and marked with its row and column.
 *
 * @param id - The image ID.
 * @param cells - The cells the image was transmitted for.
 * @returns One line per row.
 */
export function formatKittyPlaceholders(id: number, cells: CellBox): Array<string> {
	const color = `${ESC}[38;2;${(id >> 16) & 0xff};${(id >> 8) & 0xff};${id & 0xff}m`;
	const lines: Array<string> = [];
	for (let row = 0; row < cells.rows; row += 1) {
		let line = color;
		for (let column = 0; column < cells.columns; column += 1) {
			line += `${PLACEHOLDER}${getDiacritic(row)}${getDiacritic(column)}`;
		}
		lines.push(`${line}${ESC}[39m`);
	}
	return lines;
}

/**
 * Frees a transmitted image's memory in the terminal.
 *
 * @param id - The image ID.
 * @returns The escape sequence.
 */
export function formatKittyDelete(id: number): string {
	return formatCommand(`a=d,d=I,q=2,i=${id}`);
}
