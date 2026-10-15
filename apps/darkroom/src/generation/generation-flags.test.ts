import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";
import { OutputFormat } from "$validators/output-format-type";

import { mergeRerunOptions } from "./generation-flags.ts";
import { ImageType } from "./media-types.ts";

const ENTRY = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", {
	// oxlint-disable-next-line id-length -- the API calls this field n
	request: { aspectRatio: "16:9", n: 2, outputFormat: "webp", quality: "high", seed: 7 },
});

describe("mergeRerunOptions", () => {
	it("repeats the stored request when no flags are given", ({ expect }) => {
		expect.assertions(1);

		expect(mergeRerunOptions(ENTRY, { format: OutputFormat.Pretty })).toStrictEqual({
			aspectRatio: "16:9",
			background: undefined,
			compression: undefined,
			count: 2,
			output: undefined,
			quality: "high",
			resolution: undefined,
			seed: 7,
			type: ImageType.Webp,
		});
	});

	it("lets any flag override the stored value", ({ expect }) => {
		expect.assertions(1);

		const options = mergeRerunOptions(ENTRY, {
			aspectRatio: "1:1",
			count: 1,
			format: OutputFormat.Pretty,
			type: ImageType.Png,
		});

		expect(options).toMatchObject({ aspectRatio: "1:1", count: 1, quality: "high", type: ImageType.Png });
	});
});
