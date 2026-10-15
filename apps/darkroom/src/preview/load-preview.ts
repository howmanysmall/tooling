import { fitImageToCells } from "./cell-fit";
import { formatHalfBlocks } from "./half-blocks";
import { ImageProtocol } from "./image-protocol";
import { formatKittyPlaceholders, formatKittyTransmit } from "./kitty-graphics";

import type { CellBox } from "./cell-fit";

export type Preview =
	| { readonly imageId?: number | undefined; readonly kind: "image"; readonly lines: ReadonlyArray<string> }
	| { readonly kind: "message"; readonly text: string };

/**
 * A preview that may still be loading. The promise is wrapped so callers pass
 * the same promise along unchanged: React's use() suspends again whenever it
 * gets a new one.
 */
export interface LoadingPreview {
	readonly result: Promise<Preview>;
}

export interface PreviewRequest {
	/** The most cells the preview may use. */
	readonly box: CellBox;
	readonly path: string;
	readonly protocol: ImageProtocol.Blocks | ImageProtocol.Kitty;
}

/** Pixels sent per cell column; enough for a sharp image on a Retina screen. */
const PIXELS_PER_COLUMN = 20;

function createImageId(): number {
	const [random = 0] = crypto.getRandomValues(new Uint32Array(1));
	// Kitty placeholders carry the ID in a 24-bit colour, and 0 means none.
	return (random % 0xff_ff_fe) + 1;
}

/**
 * Decodes an image and turns it into preview lines. For kitty, the image is
 * sent to the terminal first, through `transmit`.
 *
 * @param request - The image, protocol, and space available.
 * @param transmit - Writes escape sequences straight to the terminal.
 * @returns The lines to draw, or a message when the image can't be read.
 */
export async function loadPreviewAsync(
	request: PreviewRequest,
	transmit: (sequence: string) => void,
): Promise<Preview> {
	try {
		const { default: sharp } = await import("sharp");
		const { height, width } = await sharp(request.path).metadata();
		if (width <= 0 || height <= 0) return { kind: "message", text: "No preview: the image has no size." };
		const cells = fitImageToCells(width, height, request.box);

		if (request.protocol === ImageProtocol.Kitty) {
			const png = await sharp(request.path)
				.resize({ fit: "inside", width: cells.columns * PIXELS_PER_COLUMN, withoutEnlargement: true })
				.png()
				.toBuffer();
			const imageId = createImageId();
			transmit(formatKittyTransmit(imageId, png, cells));
			return { imageId, kind: "image", lines: formatKittyPlaceholders(imageId, cells) };
		}

		const pixels = await sharp(request.path)
			.flatten({ background: "#000000" })
			.resize(cells.columns, cells.rows * 2, { fit: "fill" })
			.removeAlpha()
			.raw()
			.toBuffer();
		return { kind: "image", lines: formatHalfBlocks(pixels, cells.columns, cells.rows * 2) };
	} catch (error) {
		return { kind: "message", text: `No preview: ${error instanceof Error ? error.message : String(error)}` };
	}
}
