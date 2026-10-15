const ESC = "\u001B";
const UPPER_HALF = "▀";

function formatColor(pixels: Uint8Array, offset: number): string {
	return `${pixels[offset] ?? 0};${pixels[offset + 1] ?? 0};${pixels[offset + 2] ?? 0}`;
}

/**
 * Draws RGB pixels as text: each cell is an upper half block with the top
 * pixel as its foreground and the bottom pixel as its background.
 *
 * @param pixels - Packed RGB bytes, row by row.
 * @param width - Pixels per row, and so cells per line.
 * @param height - Rows of pixels; two make one line.
 * @returns One line per two rows of pixels.
 */
export function formatHalfBlocks(pixels: Uint8Array, width: number, height: number): Array<string> {
	const lines: Array<string> = [];
	for (let y = 0; y < height; y += 2) {
		let line = "";
		for (let x = 0; x < width; x += 1) {
			const top = (y * width + x) * 3;
			const bottom = y + 1 < height ? top + width * 3 : top;
			line += `${ESC}[38;2;${formatColor(pixels, top)}m${ESC}[48;2;${formatColor(pixels, bottom)}m${UPPER_HALF}`;
		}
		lines.push(`${line}${ESC}[0m`);
	}
	return lines;
}
