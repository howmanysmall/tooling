import nodePath from "node:path";
import { describe, it } from "vitest";

import { ExampleSource } from "./model-examples";
import { toExampleFileName, toShippedExamples } from "./shipped-examples";

describe("toExampleFileName", () => {
	it("keeps the provider and slug apart without a folder", ({ expect }) => {
		expect.assertions(1);

		expect(toExampleFileName("google/gemini-nano-banana-2.1")).toBe("google__gemini-nano-banana-2.1.avif");
	});
});

describe("toShippedExamples", () => {
	it("gives every model the shared prompt and its file inside the folder", ({ expect }) => {
		expect.assertions(1);

		const examples = toShippedExamples(
			{ models: { "meta/muse-image": "meta__muse-image.avif" }, prompt: "a ramen stall" },
			"/examples",
		);

		expect(examples.get("meta/muse-image")).toStrictEqual({
			path: nodePath.join("/examples", "meta__muse-image.avif"),
			prompt: "a ramen stall",
			source: ExampleSource.Shipped,
		});
	});
});
