import { describe, it } from "vitest";

import { OutputFormat } from "$validators/output-format-type";

import { formatCost, formatResult, formatSummary, toDisplayPath } from "./format-result";

import type { GenerationResult } from "./run-generation";

const RESULT: GenerationResult = {
	id: "01JA9XK2000000000000000000",
	cost: 0.08,
	created: "2026-10-14T20:26:57.000Z",
	failures: [],
	images: [
		{ mediaType: "image/png", path: "/work/2026-10-14_a-cat_1.png" },
		{ mediaType: "image/png", path: "/work/2026-10-14_a-cat_2.png" },
	],
	model: "openai/gpt-image-1",
	prompt: "a cat",
	requested: 2,
	returned: 2,
};

describe("formatResult", () => {
	it("prints one relative path per line by default", ({ expect }) => {
		expect.assertions(1);

		expect(formatResult(RESULT, OutputFormat.Pretty, "/work")).toBe(
			"./2026-10-14_a-cat_1.png\n./2026-10-14_a-cat_2.png",
		);
	});

	it("prints nothing when the image itself went to stdout", ({ expect }) => {
		expect.assertions(1);

		const piped = { ...RESULT, images: [{ mediaType: "image/png", path: undefined }] };

		expect(formatResult(piped, OutputFormat.Pretty, "/work")).toBeUndefined();
	});

	it("prints the run as one JSON object with requested and returned counts", ({ expect }) => {
		expect.assertions(1);

		const json = String(formatResult(RESULT, OutputFormat.JsonMinified, "/work"));

		expect(JSON.parse(json)).toStrictEqual({
			id: "01JA9XK2000000000000000000",
			cost: 0.08,
			created: "2026-10-14T20:26:57.000Z",
			images: [
				{ mediaType: "image/png", path: "./2026-10-14_a-cat_1.png" },
				{ mediaType: "image/png", path: "./2026-10-14_a-cat_2.png" },
			],
			model: "openai/gpt-image-1",
			prompt: "a cat",
			requested: 2,
			returned: 2,
		});
	});

	it("lists paths and media types in a table", ({ expect }) => {
		expect.assertions(2);

		const table = String(formatResult(RESULT, OutputFormat.Table, "/work"));

		expect(table).toContain("./2026-10-14_a-cat_2.png");
		expect(table).toContain("Media type");
	});
});

describe("summaries", () => {
	it("summarizes the count, model, and cost for stderr", ({ expect }) => {
		expect.assertions(2);

		expect(formatSummary(RESULT)).toBe("2 images · openai/gpt-image-1 · $0.08");
		expect(formatCost(undefined)).toBe("cost unknown");
	});

	it("keeps paths outside the working directory absolute", ({ expect }) => {
		expect.assertions(1);

		expect(toDisplayPath("/elsewhere/cat.png", "/work")).toBe("/elsewhere/cat.png");
	});
});
