import { describe, it } from "vitest";

import { getBarParts } from "./get-bar-parts";

describe("getBarParts", () => {
	it("should draw an empty track for nothing", ({ expect }) => {
		expect.assertions(1);

		expect(getBarParts(0, 10)).toStrictEqual({ filled: "", track: "──────────" });
	});

	it("should fill the whole bar for a full share", ({ expect }) => {
		expect.assertions(1);

		expect(getBarParts(80, 10)).toStrictEqual({ filled: "━━━━━━━━━━", track: "" });
	});

	it("should use a half cell for the odd half", ({ expect }) => {
		expect.assertions(1);

		expect(getBarParts(27, 10)).toStrictEqual({ filled: "━━━╸", track: "──────" });
	});

	it("should show at least half a cell for any non-zero share", ({ expect }) => {
		expect.assertions(1);

		expect(getBarParts(1, 10)).toStrictEqual({ filled: "╸", track: "─────────" });
	});
});
