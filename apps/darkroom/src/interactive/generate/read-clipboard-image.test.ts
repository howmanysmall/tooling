import { describe, it } from "vitest";

import { readClipboardImageAsync } from "./read-clipboard-image";

import type { ClipboardImageOptions } from "./read-clipboard-image";

const SAVED_PICTURE = /^\/fake-temporary\/[^/]+\.png$/u;

interface FakeClipboard {
	/** What AppleScript reports as the copied file, if there is one. */
	readonly file?: string;
	/** Whether a picture is on the clipboard. */
	readonly hasPicture?: boolean;
}

interface FakeMac {
	readonly options: ClipboardImageOptions;
	/** Where the picture was saved, if it was. */
	readonly savedTo: ReadonlyArray<string>;
	/** Every script that ran. */
	readonly scripts: ReadonlyArray<string>;
}

function isPngFile(path: string): boolean {
	return path.endsWith(".png");
}

function createFakeMac({ file, hasPicture = false }: FakeClipboard): FakeMac {
	const scripts = new Array<string>();
	const savedTo = new Array<string>();

	return {
		options: {
			isImage: isPngFile,
			platform: "darwin",
			async runScriptAsync(script, target): Promise<string | undefined> {
				scripts.push(script);

				if (script.includes("furl")) return file;
				if (!hasPicture) return undefined;

				savedTo.push(target);
				return "";
			},
			temporaryDirectory: "/fake-temporary",
		},
		savedTo,
		scripts,
	};
}

describe("readClipboardImageAsync", () => {
	it("doesn't ask the clipboard anything off macOS", async ({ expect }) => {
		expect.assertions(2);

		const { options, scripts } = createFakeMac({ file: "/photos/cat.png", hasPicture: true });

		await expect(readClipboardImageAsync({ ...options, platform: "linux" })).resolves.toBeUndefined();
		expect(scripts).toStrictEqual([]);
	});

	it("returns a copied image file where it already is", async ({ expect }) => {
		expect.assertions(1);

		const { options } = createFakeMac({ file: "/photos/cat.png", hasPicture: true });

		await expect(readClipboardImageAsync(options)).resolves.toBe("/photos/cat.png");
	});

	it("saves the picture when the copied file isn't an image", async ({ expect }) => {
		expect.assertions(2);

		const { options, savedTo } = createFakeMac({ file: "/notes/todo.txt", hasPicture: true });
		const path = await readClipboardImageAsync(options);

		expect(path).not.toBe("/notes/todo.txt");
		expect(savedTo).toStrictEqual([path]);
	});

	it("returns a png in the temporary directory, where the picture was saved", async ({ expect }) => {
		expect.assertions(2);

		const { options, savedTo } = createFakeMac({ hasPicture: true });
		const path = await readClipboardImageAsync(options);

		expect(path).toMatch(SAVED_PICTURE);
		expect(savedTo).toStrictEqual([path]);
	});

	it("finds nothing when the clipboard holds no image", async ({ expect }) => {
		expect.assertions(1);

		const { options } = createFakeMac({});

		await expect(readClipboardImageAsync(options)).resolves.toBeUndefined();
	});
});
