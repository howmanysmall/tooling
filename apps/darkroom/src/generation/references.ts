import { readFile, stat } from "node:fs/promises";
import nodePath from "node:path";
import { ValidationError } from "@cliffy/command";

import { isReferenceMediaType, REFERENCE_EXTENSIONS, sniffMediaType } from "./media-types";

export interface ReferenceImage {
	readonly bytes: Uint8Array;
	readonly mediaType: string;
	/** The path or URL it came from. */
	readonly source: string;
}

const URL_PATTERN = /^https?:\/\//iu;

export function isUrl(source: string): boolean {
	return URL_PATTERN.test(source);
}

function toReferenceImage(source: string, bytes: Uint8Array): ReferenceImage {
	const mediaType = sniffMediaType(bytes);
	if (mediaType === undefined || !isReferenceMediaType(mediaType)) {
		throw new ValidationError(`Reference ${source} is not a PNG, JPEG, WebP, or GIF image.`);
	}

	return { bytes, mediaType, source };
}

async function downloadAsync(url: string, fetchAsync: typeof fetch): Promise<ReferenceImage> {
	let response: Response;
	try {
		response = await fetchAsync(url);
	} catch (error) {
		if (!(error instanceof Error)) {
			throw error;
		}

		throw new ValidationError(`Could not download reference ${url}: ${error.message}`, { cause: error });
	}

	if (!response.ok) {
		throw new ValidationError(`Could not download reference ${url}: HTTP ${response.status}.`);
	}

	return toReferenceImage(url, new Uint8Array(await response.arrayBuffer()));
}

async function readLocalAsync(path: string): Promise<ReferenceImage> {
	const extension = nodePath.extname(path).toLowerCase();
	if (!REFERENCE_EXTENSIONS.has(extension)) {
		throw new ValidationError(`Reference ${path} must be a .png, .jpg, .jpeg, .webp, or .gif file.`);
	}

	try {
		const stats = await stat(path);
		if (!stats.isFile()) {
			throw new ValidationError(`Reference ${path} is not a file.`);
		}
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}

		throw new ValidationError(`Reference image not found: ${path}`, { cause: error });
	}

	return toReferenceImage(path, new Uint8Array(await readFile(path)));
}

/**
 * Loads a `-i` reference image from a path or an http(s) URL, and checks that
 * its bytes really are an image.
 *
 * @param source - A file path or URL.
 * @param fetchAsync - The fetch implementation, for tests.
 * @returns The image bytes and media type.
 * @rejects A `ValidationError` when the source is missing, can't be
 *   downloaded, or is not a supported image.
 */
export async function loadReferenceAsync(source: string, fetchAsync: typeof fetch = fetch): Promise<ReferenceImage> {
	return isUrl(source) ? downloadAsync(source, fetchAsync) : readLocalAsync(source);
}

export function toDataUrl(reference: ReferenceImage): string {
	return `data:${reference.mediaType};base64,${Buffer.from(reference.bytes).toString("base64")}`;
}
