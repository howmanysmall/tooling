import { describe, it } from "vitest";

import { findEnclosing } from "./find-enclosing";

describe("findEnclosing", () => {
	it("should find the nearest ancestor that is a candidate", ({ expect }) => {
		expect.assertions(1);

		const candidates = new Set(["/work", "/work/apps", "/work/apps/web/deep"]);

		expect(findEnclosing("/work/apps/web/deep/pkg", candidates)).toBe("/work/apps/web/deep");
	});

	it("should skip ancestors that are not candidates", ({ expect }) => {
		expect.assertions(1);

		expect(findEnclosing("/work/apps/web/pkg", new Set(["/work"]))).toBe("/work");
	});

	it("should not count the directory itself", ({ expect }) => {
		expect.assertions(1);

		expect(findEnclosing("/work/apps", new Set(["/work/apps"]))).toBeUndefined();
	});

	it("should return undefined when nothing encloses it, all the way up to the root", ({ expect }) => {
		expect.assertions(1);

		expect(findEnclosing("/work/apps", new Set(["/elsewhere"]))).toBeUndefined();
	});
});
