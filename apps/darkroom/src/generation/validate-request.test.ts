import { describe, it } from "vitest";

import { ImageType } from "./media-types.ts";
import { MULTI_MODEL, SINGLE_MODEL } from "./model-fixture.ts";
import { validateRequest } from "./validate-request.ts";

import type { GenerationOptions, ValidationContext } from "./validate-request.ts";

function validate(
	options: GenerationOptions,
	context: Partial<ValidationContext> = {},
): ReturnType<typeof validateRequest> {
	return validateRequest(options, { model: MULTI_MODEL, referenceCount: 0, stdoutIsTty: false, ...context });
}

describe("validateRequest", () => {
	it("passes declared values through and defaults to one image", ({ expect }) => {
		expect.assertions(1);

		expect(validate({ aspectRatio: "16:9", quality: "high" }).parameters).toMatchObject({
			aspectRatio: "16:9",
			count: 1,
			quality: "high",
		});
	});

	it("rejects more images than the model returns, treating undeclared n as one", ({ expect }) => {
		expect.assertions(3);

		expect(() => validate({ count: 11 })).toThrow("--count must be a whole number from 1 to 10");
		expect(() => validate({ count: 2 }, { model: SINGLE_MODEL })).toThrow("returns at most 1 image per request");
		expect(validate({ count: 10 }).parameters.count).toBe(10);
	});

	it("rejects values outside a declared enum but lets undeclared parameters through", ({ expect }) => {
		expect.assertions(2);

		expect(() => validate({ aspectRatio: "21:9" })).toThrow('does not support --aspect-ratio "21:9"');
		expect(validate({ resolution: "4K" }).parameters.resolution).toBe("4K");
	});

	it("checks reference counts, treating undeclared input_references as none", ({ expect }) => {
		expect.assertions(2);

		expect(() => validate({}, { referenceCount: 17 })).toThrow("accepts at most 16 reference images");
		expect(() => validate({}, { model: SINGLE_MODEL, referenceCount: 1 })).toThrow(
			"does not accept reference images",
		);
	});

	it("takes the encoding from -o and rejects a disagreeing --type", ({ expect }) => {
		expect.assertions(3);

		expect(validate({ output: "cat.webp" }).parameters.outputFormat).toBe(ImageType.Webp);
		expect(() => validate({ output: "cat.webp", type: ImageType.Png })).toThrow("disagrees with the extension");
		expect(() => validate({ output: "cat.bmp" })).toThrow("can't write");
	});

	it("requires png or webp for a transparent background", ({ expect }) => {
		expect.assertions(2);

		expect(() => validate({ background: "transparent", type: ImageType.Jpeg })).toThrow("needs png or webp");
		expect(validate({ background: "transparent", type: ImageType.Png }).parameters.background).toBe("transparent");
	});

	it("allows -o - only for a single image going to a pipe", ({ expect }) => {
		expect.assertions(3);

		expect(() => validate({ count: 2, output: "-" })).toThrow("writes a single image");
		expect(() => validate({ output: "-" }, { stdoutIsTty: true })).toThrow("binary image data to the terminal");
		expect(validate({ output: "-" }).parameters.count).toBe(1);
	});

	it("warns instead of failing for an undeclared seed and PNG compression", ({ expect }) => {
		expect.assertions(1);

		expect(validate({ compression: 50, seed: 7, type: ImageType.Png }).warnings).toStrictEqual([
			"test/multi does not declare seed support; --seed may be ignored.",
			"--compression has no effect on PNG output.",
		]);
	});
});
