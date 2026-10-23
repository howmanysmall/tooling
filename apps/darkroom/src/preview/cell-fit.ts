import { ROW_COLUMN_DIACRITICS } from "./row-column-diacritics";

export interface CellBox {
	readonly columns: number;
	readonly rows: number;
}

/** Terminal cells are about twice as tall as they are wide. */
const CELL_ASPECT = 2;

/** Placeholders can only number this many rows and columns. */
const MAX_CELLS = ROW_COLUMN_DIACRITICS.length;

function clampCells(value: number, max: number): number {
	return Math.max(1, Math.min(max, MAX_CELLS, value));
}

/**
 * Works out the largest cell area within a box that keeps an image's shape.
 *
 * @param width - The image width in pixels.
 * @param height - The image height in pixels.
 * @param box - The most cells the preview may use.
 * @returns The cells the preview should fill.
 */
export function fitImageToCells(width: number, height: number, box: CellBox): CellBox {
	const columns = clampCells(Math.round((box.rows * CELL_ASPECT * width) / height), box.columns);
	const rows = clampCells(Math.round((columns * height) / (width * CELL_ASPECT)), box.rows);
	return { columns, rows };
}
