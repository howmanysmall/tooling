import { ImageProtocol } from "./image-protocol";
import { formatKittyDelete } from "./kitty-graphics";
import { loadPreviewAsync } from "./load-preview";

import type { CellBox } from "./cell-fit";
import type { LoadingPreview, Preview } from "./load-preview";

/**
 * Loads each preview once per size, so React can suspend on the same promise
 * across renders, and remembers the images sent to the terminal so they can
 * be freed.
 */
export class PreviewCache {
	private readonly imageIds = new Set<number>();
	private readonly previews = new Map<string, LoadingPreview>();
	private readonly protocol: ImageProtocol.Blocks | ImageProtocol.Kitty;
	private readonly write: (sequence: string) => void;

	public constructor(protocol: ImageProtocol.Blocks | ImageProtocol.Kitty, write: (sequence: string) => void) {
		this.protocol = protocol;
		this.write = write;
	}

	/** Frees every image sent to the terminal. */
	public dispose(): void {
		for (const id of this.imageIds) this.write(formatKittyDelete(id));
		this.imageIds.clear();
	}

	/**
	 * Gets the preview of an image, loading it on first use.
	 *
	 * @param path - The image file.
	 * @param box - The most cells the preview may use.
	 * @returns The same loading preview for the same image and size.
	 */
	public getPreview(path: string, box: CellBox): LoadingPreview {
		const key = `${box.columns}x${box.rows}:${path}`;
		const cached = this.previews.get(key);
		if (cached !== undefined) return cached;

		const preview = { result: this.loadAsync(path, box) };
		this.previews.set(key, preview);
		return preview;
	}

	private async loadAsync(path: string, box: CellBox): Promise<Preview> {
		const preview = await loadPreviewAsync({ box, path, protocol: this.protocol }, this.write);
		if (preview.kind === "image" && preview.imageId !== undefined) this.imageIds.add(preview.imageId);
		return preview;
	}
}

/**
 * Creates the preview cache for a protocol.
 *
 * @param protocol - How previews are drawn.
 * @param write - Writes escape sequences straight to the terminal.
 * @returns The cache, or `undefined` when previews are off.
 */
export function createPreviewCache(
	protocol: ImageProtocol,
	write: (sequence: string) => void,
): PreviewCache | undefined {
	return protocol === ImageProtocol.Off ? undefined : new PreviewCache(protocol, write);
}
