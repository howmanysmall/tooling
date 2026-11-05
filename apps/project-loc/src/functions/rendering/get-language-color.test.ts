import { describe, it } from "vitest";

import { getLanguageColor } from "./get-language-color";

const HEX_COLOR = /^[0-9a-f]{6}$/u;

describe("getLanguageColor", () => {
	it("should use the listed color for a known language", ({ expect }) => {
		expect.assertions(2);

		expect(getLanguageColor("TypeScript")).toBe("3178c6");
		expect(getLanguageColor("Rust")).toBe("dea584");
	});

	it("should give an unlisted language the same color every time", ({ expect }) => {
		expect.assertions(2);

		expect(getLanguageColor("Malbolge")).toBe(getLanguageColor("Malbolge"));
		expect(getLanguageColor("Malbolge")).toMatch(HEX_COLOR);
	});
});
