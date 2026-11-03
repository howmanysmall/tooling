import { describe, it } from "vitest";

import { defineConfiguration } from "./index";

describe("defineConfiguration", () => {
	it("returns the configuration a file exports", ({ expect }) => {
		expect.assertions(1);

		const configuration = { ignore: ["a/*"] };

		expect(defineConfiguration(configuration)).toBe(configuration);
	});
});
