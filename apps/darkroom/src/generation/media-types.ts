import nodePath from "node:path";

/** The image encodings `--type` accepts, matching the API's `output_format`. */
export const enum ImageType {
	Jpeg = "jpeg",
	Png = "png",
	Svg = "svg",
	Webp = "webp",
}

export const IMAGE_TYPES: ReadonlyArray<ImageType> = [ImageType.Jpeg, ImageType.Png, ImageType.Svg, ImageType.Webp];

const MEDIA_GIF = "image/gif";
const MEDIA_JPEG = "image/jpeg";
const MEDIA_PNG = "image/png";
const MEDIA_SVG = "image/svg+xml";
const MEDIA_WEBP = "image/webp";

const EXTENSION_TO_IMAGE_TYPE: ReadonlyMap<string, ImageType> = new Map([
	[".jpeg", ImageType.Jpeg],
	[".jpg", ImageType.Jpeg],
	[".png", ImageType.Png],
	[".svg", ImageType.Svg],
	[".webp", ImageType.Webp],
]);

const MEDIA_TYPE_TO_EXTENSION: ReadonlyMap<string, string> = new Map([
	[MEDIA_GIF, "gif"],
	[MEDIA_JPEG, "jpg"],
	[MEDIA_PNG, "png"],
	[MEDIA_SVG, "svg"],
	[MEDIA_WEBP, "webp"],
]);

const IMAGE_TYPE_TO_MEDIA_TYPE: Readonly<Record<ImageType, string>> = {
	[ImageType.Jpeg]: MEDIA_JPEG,
	[ImageType.Png]: MEDIA_PNG,
	[ImageType.Svg]: MEDIA_SVG,
	[ImageType.Webp]: MEDIA_WEBP,
};

/** Extensions accepted for `-i` reference images. */
export const REFERENCE_EXTENSIONS: ReadonlySet<string> = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);

/** Media types accepted for reference images, from files or URLs. */
const REFERENCE_MEDIA_TYPES: ReadonlySet<string> = new Set([MEDIA_GIF, MEDIA_JPEG, MEDIA_PNG, MEDIA_WEBP]);

export function isReferenceMediaType(mediaType: string): boolean {
	return REFERENCE_MEDIA_TYPES.has(mediaType);
}

/**
 * Gets the image type implied by a path's extension.
 *
 * @param path - A file path such as `out.png`.
 * @returns The image type, or `undefined` when the path has no extension or
 *   one darkroom can't write.
 */
export function getImageTypeFromPath(path: string): ImageType | undefined {
	return EXTENSION_TO_IMAGE_TYPE.get(nodePath.extname(path).toLowerCase());
}

export function getMediaTypeForImageType(imageType: ImageType): string {
	return IMAGE_TYPE_TO_MEDIA_TYPE[imageType];
}

/**
 * Gets the file extension, without a dot, for a media type.
 *
 * @param mediaType - A media type such as `image/png`.
 * @returns The extension, or `bin` for unknown media types.
 */
export function getExtensionForMediaType(mediaType: string): string {
	return MEDIA_TYPE_TO_EXTENSION.get(mediaType.toLowerCase()) ?? "bin";
}

function startsWith(bytes: Uint8Array, signature: ReadonlyArray<number>, offset = 0): boolean {
	if (bytes.length < offset + signature.length) return false;
	return signature.every((byte, index) => bytes[offset + index] === byte);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const GIF_SIGNATURE = [0x47, 0x49, 0x46, 0x38];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const SVG_PATTERN = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/iu;

/**
 * Detects an image's media type from its first bytes.
 *
 * @param bytes - The file contents.
 * @returns The media type, or `undefined` if the bytes are not a known image.
 */
export function sniffMediaType(bytes: Uint8Array): string | undefined {
	if (startsWith(bytes, PNG_SIGNATURE)) return MEDIA_PNG;
	if (startsWith(bytes, JPEG_SIGNATURE)) return MEDIA_JPEG;
	if (startsWith(bytes, GIF_SIGNATURE)) return MEDIA_GIF;
	if (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8)) return MEDIA_WEBP;

	const head = new TextDecoder().decode(bytes.subarray(0, 1024));
	return SVG_PATTERN.test(head) ? MEDIA_SVG : undefined;
}
