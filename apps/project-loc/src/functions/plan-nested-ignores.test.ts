import { describe, it } from "vitest";

import { planNestedIgnores } from "./plan-nested-ignores";

describe("planNestedIgnores", () => {
	it("should have each parent ignore the packages inside it, anchored to the parent", ({ expect }) => {
		expect.assertions(1);

		const all = ["/work", "/work/apps/web", "/work/apps/web/packages/ui", "/work/tools"];

		expect(planNestedIgnores(all, all)).toStrictEqual(
			new Map([
				["/work", ["/apps/web/", "/tools/"]],
				["/work/apps/web", ["/packages/ui/"]],
			]),
		);
	});

	it("should give a package to its nearest parent only", ({ expect }) => {
		expect.assertions(1);

		const all = ["/work", "/work/a", "/work/a/b"];
		const plan = planNestedIgnores(all, all);

		expect(plan.get("/work")).toStrictEqual(["/a/"]);
	});

	it("should plan nothing for a parent that is not being counted", ({ expect }) => {
		expect.assertions(1);

		const all = ["/work", "/work/a"];

		expect(planNestedIgnores(all, ["/work/a"])).toStrictEqual(new Map());
	});

	it("should escape glob characters in a package path", ({ expect }) => {
		expect.assertions(1);

		const all = ["/work", "/work/odd[name]"];

		expect(planNestedIgnores(all, all).get("/work")).toStrictEqual([String.raw`/odd\[name\]/`]);
	});
});
