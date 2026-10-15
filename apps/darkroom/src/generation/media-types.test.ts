import { describe, it } from "vitest";

import { getExtensionForMediaType, getImageTypeFromPath, ImageType, sniffMediaType } from "./media-types.ts";

const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP_HEADER = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("sniffMediaType", () => {
	it("recognizes PNG, JPEG, WebP, GIF, and SVG from their first bytes", ({ expect }) => {
		expect.assertions(5);

		expect(sniffMediaType(PNG_HEADER)).toBe("image/png");
		expect(sniffMediaType(JPEG_HEADER)).toBe("image/jpeg");
		expect(sniffMediaType(WEBP_HEADER)).toBe("image/webp");
		expect(sniffMediaType(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
		expect(sniffMediaType(new TextEncoder().encode('<?xml version="1.0"?>\n<svg xmlns="x">'))).toBe(
			"image/svg+xml",
		);
	});

	it("returns undefined for anything else", ({ expect }) => {
		expect.assertions(1);

		expect(sniffMediaType(new TextEncoder().encode("<html><body>"))).toBeUndefined();
	});
});

describe("extensions", () => {
	it("maps paths to image types, rejecting unknown extensions", ({ expect }) => {
		expect.assertions(3);

		expect(getImageTypeFromPath("out.JPG")).toBe(ImageType.Jpeg);
		expect(getImageTypeFromPath("out")).toBeUndefined();
		expect(getImageTypeFromPath("out.bmp")).toBeUndefined();
	});

	it("maps media types to extensions", ({ expect }) => {
		expect.assertions(2);

		expect(getExtensionForMediaType("image/svg+xml")).toBe("svg");
		expect(getExtensionForMediaType("image/jpeg")).toBe("jpg");
	});
});
