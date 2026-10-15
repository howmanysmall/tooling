import { describe, it } from "vitest";

import { selectParameterValues } from "./model-parameter-completions.ts";

const LINES = [
	"openai/gpt-image-1\taspect_ratio\t1:1\t3:2\t2:3\tauto",
	"openai/gpt-image-1\tquality\tlow\thigh",
	"google/gemini\taspect_ratio\t1:1\t16:9\t21:9",
];

describe("selectParameterValues", () => {
	it("offers only the values the chosen model declares", ({ expect }) => {
		expect.assertions(1);

		expect(selectParameterValues(LINES, "aspect_ratio", "google/gemini")).toStrictEqual(["1:1", "16:9", "21:9"]);
	});

	it("offers every model's values when no model is chosen", ({ expect }) => {
		expect.assertions(1);

		expect(selectParameterValues(LINES, "aspect_ratio", undefined)).toStrictEqual([
			"1:1",
			"3:2",
			"2:3",
			"auto",
			"16:9",
			"21:9",
		]);
	});

	it("falls back to every model's values when the chosen model doesn't declare the parameter", ({ expect }) => {
		expect.assertions(1);

		expect(selectParameterValues(LINES, "quality", "google/gemini")).toStrictEqual(["low", "high"]);
	});
});
