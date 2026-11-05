import { describe, it } from "vitest";

import { parseSccOutput } from "./parse-scc-output";

describe("parseSccOutput", () => {
	it("should read what scc prints", ({ expect }) => {
		expect.assertions(1);

		const output = JSON.stringify([
			{
				Blank: 3,
				Bytes: 100,
				Code: 10,
				Comment: 2,
				Complexity: 4,
				Count: 2,
				Files: [],
				Name: "Rust",
			},
		]);

		expect(parseSccOutput(output)).toStrictEqual([
			{ name: "Rust", blank: 3, code: 10, comment: 2, complexity: 4, files: 2 },
		]);
	});

	it("should read null, which scc prints for an empty directory, as no languages", ({ expect }) => {
		expect.assertions(1);

		expect(parseSccOutput("null")).toStrictEqual([]);
	});

	it("should reject anything that is not scc output", ({ expect }) => {
		expect.assertions(3);

		expect(parseSccOutput("")).toBeUndefined();
		expect(parseSccOutput("not json")).toBeUndefined();
		expect(parseSccOutput(JSON.stringify([{ Name: "Rust" }]))).toBeUndefined();
	});
});
