import { describe, it } from "vitest";

import { applyEdit, planEdits } from "./references";

import type { Edit, PlanOptions, Project, Reference } from "./references";

function createProject(
	directory: string,
	name: string,
	references: ReadonlyArray<string> = [],
	workspaceDependencies: ReadonlyArray<string> = [],
): Project {
	return {
		name,
		directory,
		references: references.map((path) => ({ path })),
		workspaceDependencies,
	};
}

function plan(options: Partial<PlanOptions>): ReadonlyArray<Edit> {
	return planEdits({
		ignore: [],
		projects: [],
		rootReferences: undefined,
		workspaceGlobs: ["apps/*", "packages/*"],
		...options,
	});
}

function createEdit(add: ReadonlyArray<string>, remove: ReadonlyArray<string>): Edit {
	return { add, file: "tsconfig.json", remove };
}

describe("planEdits", () => {
	describe("project references", () => {
		// Catches a dependency that the type checker would not build first.
		it("adds a missing dependency as a path relative to the project", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", [], ["b"]), createProject("packages/b", "b")];

			expect(plan({ projects })).toStrictEqual([
				{ add: ["../../packages/b"], file: "apps/a/tsconfig.json", remove: [] },
			]);
		});

		// Catches a project still building against a package it stopped using.
		it("removes a reference to a project that is no longer a dependency", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", ["../../packages/b"]), createProject("packages/b", "b")];

			expect(plan({ projects })).toStrictEqual([
				{ add: [], file: "apps/a/tsconfig.json", remove: ["../../packages/b"] },
			]);
		});

		// Catches a dangling reference breaking builds once a package is gone.
		it("removes a reference to a deleted package under a workspace glob", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", ["../../packages/gone"])];

			expect(plan({ projects })).toStrictEqual([
				{ add: [], file: "apps/a/tsconfig.json", remove: ["../../packages/gone"] },
			]);
		});

		// Catches a package being told to build itself, which TypeScript rejects.
		it("does not add a reference for a dependency on itself", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("packages/a", "a", [], ["a"])];

			expect(plan({ projects })).toStrictEqual([]);
		});

		it("removes an existing reference to itself", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("packages/a", "a", ["./"], ["a"])];

			expect(plan({ projects })).toStrictEqual([{ add: [], file: "packages/a/tsconfig.json", remove: ["./"] }]);
		});

		// Catches a reference to a package with no tsconfig to build.
		it("adds nothing for a dependency that is not a discovered project", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", [], ["not-a-project"])];

			expect(plan({ projects })).toStrictEqual([]);
		});
	});

	describe("root references", () => {
		// Catches `tsc --build` at the root skipping a project.
		it("adds every project to the root, starting with ./", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a"), createProject("packages/b", "b")];

			expect(plan({ projects, rootReferences: [] })).toStrictEqual([
				{ add: ["./apps/a", "./packages/b"], file: "tsconfig.json", remove: [] },
			]);
		});

		// Catches a plan that names a root tsconfig the workspace does not have.
		it("plans no root edit when the root tsconfig does not exist", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a")];

			expect(plan({ projects, rootReferences: undefined })).toStrictEqual([]);
		});
	});

	describe("hand-owned references", () => {
		// Catches the sync deleting a root reference somebody added by hand.
		it("keeps a root reference to a tsconfig file", ({ expect }) => {
			expect.assertions(1);

			expect(plan({ rootReferences: [{ path: "./tsconfig.node.json" }] })).toStrictEqual([]);
		});

		it("keeps a reference outside every workspace glob", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", ["../../some/handwritten"])];

			expect(plan({ projects })).toStrictEqual([]);
		});

		// Catches an ignored package being mistaken for a deleted one.
		it("keeps a reference to an ignored path", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("apps/a", "a", ["../../packages/legacy"])];

			expect(plan({ ignore: ["packages/legacy"], projects })).toStrictEqual([]);
		});

		// Catches a negated directory being mistaken for a deleted package.
		it("keeps a reference to a path a workspace glob negates", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("packages/a", "a", ["../skipped"])];

			expect(plan({ projects, workspaceGlobs: ["packages/*", "!packages/skipped"] })).toStrictEqual([]);
		});

		// Catches `**` treating a secondary tsconfig as a deleted package.
		it("keeps a reference to a file under a recursive glob", ({ expect }) => {
			expect.assertions(1);

			const projects = [createProject("packages/a", "a", ["../b/tsconfig.lib.json"])];

			expect(plan({ projects, workspaceGlobs: ["packages/**"] })).toStrictEqual([]);
		});
	});

	describe("planning no edit", () => {
		// Catches `--check` failing on a reference to the right project.
		it.for(["./a", "./a/", "a", "./a/tsconfig.json"])(
			"treats %s as a reference to project a",
			(path, { expect }) => {
				expect.assertions(1);

				const edits = plan({
					projects: [createProject("a", "a")],
					rootReferences: [{ path }],
					workspaceGlobs: ["*"],
				});

				expect(edits).toStrictEqual([]);
			},
		);

		// Catches churn on a file that is only out of alphabetical order.
		it("plans no edit when only the order differs", ({ expect }) => {
			expect.assertions(1);

			const edits = plan({
				projects: [createProject("apps/a", "a"), createProject("packages/b", "b")],
				rootReferences: [{ path: "./packages/b" }, { path: "./apps/a" }],
			});

			expect(edits).toStrictEqual([]);
		});
	});

	// Catches output that reorders between runs and machines.
	it("returns edits sorted by file", ({ expect }) => {
		expect.assertions(1);

		const edits = plan({
			projects: [createProject("packages/b", "b", [], ["a"]), createProject("apps/a", "a", [], ["b"])],
			rootReferences: [],
		});

		expect(edits.map(({ file }) => file)).toStrictEqual([
			"apps/a/tsconfig.json",
			"packages/b/tsconfig.json",
			"tsconfig.json",
		]);
	});
});

describe("applyEdit", () => {
	// Catches a locale-aware sort rewriting files differently per machine.
	it("sorts the result in byte order, uppercase first", ({ expect }) => {
		expect.assertions(1);

		const result = applyEdit([{ path: "./a" }], createEdit(["./B", "./c"], []));

		expect(result).toStrictEqual([{ path: "./B" }, { path: "./a" }, { path: "./c" }]);
	});

	// Catches the sync dropping options such as `prepend` from a kept entry.
	it("keeps extra fields on a kept reference", ({ expect }) => {
		expect.assertions(1);

		const prepended: Reference & { readonly prepend: boolean } = { path: "./a", prepend: true };

		expect(applyEdit([prepended], createEdit(["./b"], []))).toStrictEqual([
			{ path: "./a", prepend: true },
			{ path: "./b" },
		]);
	});

	// Catches churn from rewriting a working reference to a canonical form.
	it("keeps the original spelling of a kept reference", ({ expect }) => {
		expect.assertions(1);

		const result = applyEdit([{ path: "a/tsconfig.json" }], createEdit(["./b"], []));

		expect(result).toStrictEqual([{ path: "./b" }, { path: "a/tsconfig.json" }]);
	});

	// Catches a removal that misses because it compared canonical paths.
	it("removes a reference by the spelling in the file and adds new ones as bare paths", ({ expect }) => {
		expect.assertions(1);

		const result = applyEdit([{ path: "./gone/" }, { path: "./kept" }], createEdit(["./new"], ["./gone/"]));

		expect(result).toStrictEqual([{ path: "./kept" }, { path: "./new" }]);
	});
});
