import { describe, it } from "vitest";

import { name } from "./constants.ts";

describe("package metadata", () => {
	it("exposes the published package name", ({ expect }) => {
		expect.assertions(1);

		expect(name).toBe("@pobammer-ts/darkroom");
	});
});
