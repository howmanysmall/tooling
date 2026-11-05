import { describe, it } from "vitest";

import { selectProjects } from "./select-projects";

describe("selectProjects", () => {
	const projects = ["/work/apps/web", "/work/apps/api", "/work/tools/web"];

	it("should keep everything when no names are given", ({ expect }) => {
		expect.assertions(1);

		expect(selectProjects(projects, "/work", [])).toStrictEqual(projects);
	});

	it("should match a path relative to the root", ({ expect }) => {
		expect.assertions(1);

		expect(selectProjects(projects, "/work", ["apps/web"])).toStrictEqual(["/work/apps/web"]);
	});

	it("should match a base name, which can match several projects", ({ expect }) => {
		expect.assertions(1);

		expect(selectProjects(projects, "/work", ["web"])).toStrictEqual(["/work/apps/web", "/work/tools/web"]);
	});

	it("should accept several names at once", ({ expect }) => {
		expect.assertions(1);

		expect(selectProjects(projects, "/work", ["api", "tools/web"])).toStrictEqual([
			"/work/apps/api",
			"/work/tools/web",
		]);
	});

	it("should return nothing when no name matches", ({ expect }) => {
		expect.assertions(1);

		expect(selectProjects(projects, "/work", ["missing"])).toStrictEqual([]);
	});
});
