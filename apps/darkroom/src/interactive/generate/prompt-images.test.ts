import { describe, it } from "vitest";

import { parsePastedImagePaths, resolvePromptImages } from "./prompt-images";

function isPng(path: string): boolean {
	return path.endsWith(".png");
}

describe("parsePastedImagePaths", () => {
	it("reads a path the way each terminal pastes it", ({ expect }) => {
		expect.assertions(5);

		const raycast = "/Users/anna/Library/Application Support/com.raycast.macos/clipboard/file-c7.png";

		expect(parsePastedImagePaths(` '${raycast}'\n`, isPng)).toStrictEqual([raycast]);
		expect(parsePastedImagePaths(raycast, isPng)).toStrictEqual([raycast]);
		expect(parsePastedImagePaths(String.raw`/tmp/a\ cat.png `, isPng)).toStrictEqual(["/tmp/a cat.png"]);
		expect(parsePastedImagePaths("file:///tmp/a%20cat.png", isPng)).toStrictEqual(["/tmp/a cat.png"]);
		expect(parsePastedImagePaths("/tmp/a.png '/tmp/b c.png'", isPng)).toStrictEqual(["/tmp/a.png", "/tmp/b c.png"]);
	});

	it("leaves a prompt that only mentions a path as text", ({ expect }) => {
		expect.assertions(2);

		expect(parsePastedImagePaths("make /tmp/a.png bluer", isPng)).toBeUndefined();
		expect(parsePastedImagePaths("  \n", isPng)).toBeUndefined();
	});
});

describe("resolvePromptImages", () => {
	const images = [
		{ number: 1, path: "/a.png" },
		{ number: 2, path: "/b.png" },
	];

	it("drops an image whose token is gone and numbers the rest by position", ({ expect }) => {
		expect.assertions(1);

		expect(resolvePromptImages("a fox like [Image 2]", images, 1)).toStrictEqual({
			paths: ["/b.png"],
			prompt: "a fox like [Image 1]",
		});
	});

	it("counts the image being edited, and leaves a token nothing was pasted for", ({ expect }) => {
		expect.assertions(1);

		expect(resolvePromptImages("[Image 1] then [Image 9]", images, 2)).toStrictEqual({
			paths: ["/a.png"],
			prompt: "[Image 2] then [Image 9]",
		});
	});
});
