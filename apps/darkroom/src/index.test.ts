import { describe, it } from "vitest";

import { description, name } from "./index.ts";

describe("package metadata", () => {
	it("exposes the package name and description", ({ expect }) => {
		expect.assertions(2);

		expect(name).toBe("@pobammer-ts/darkroom");
		expect(description).toBe("A command-line tool.");
	});
});
