import { describe, it } from "vitest";

import { SortKey } from "$meta/sort-key";

import { aggregateProjects, serializeAggregate } from "./aggregation-utilities";

import type { CountedProject, LanguageStats } from "$types/code-types";

function createLanguage(name: string, code: number, overrides: Partial<LanguageStats> = {}): LanguageStats {
	return { name, blank: 0, code, comment: 0, complexity: 0, files: 1, ...overrides };
}

describe("aggregation-utilities", () => {
	describe("aggregateProjects", () => {
		const alpha: CountedProject = {
			languages: [
				createLanguage("Rust", 300, { blank: 20, comment: 30, complexity: 10, files: 3 }),
				createLanguage("TypeScript", 50, { files: 2 }),
			],
			path: "/work/alpha",
		};
		const beta: CountedProject = {
			languages: [createLanguage("TypeScript", 100, { blank: 5, complexity: 2 })],
			path: "/work/Beta",
		};

		it("should total each project and name it relative to the root", ({ expect }) => {
			expect.assertions(1);

			const { projects } = aggregateProjects("/work", [alpha], SortKey.Code);

			expect(projects[0]).toMatchObject({
				name: "alpha",
				blank: 20,
				code: 350,
				comment: 30,
				complexity: 10,
				files: 5,
				path: "/work/alpha",
			});
		});

		it("should list a project's languages from most code to least", ({ expect }) => {
			expect.assertions(1);

			const mixed: CountedProject = {
				languages: [createLanguage("B", 1), createLanguage("A", 1), createLanguage("C", 9)],
				path: "/work/x",
			};
			const { projects } = aggregateProjects("/work", [mixed], SortKey.Code);

			expect(projects[0]?.languages.map((entry) => entry.name)).toStrictEqual(["C", "A", "B"]);
		});

		describe("sorting", () => {
			// Each key puts these three in a different order.
			const few: CountedProject = {
				languages: [createLanguage("Go", 1, { blank: 1, comment: 9, complexity: 5, files: 5 })],
				path: "/work/few",
			};
			const many: CountedProject = {
				languages: [createLanguage("Go", 9, { blank: 8, comment: 1, complexity: 1, files: 1 })],
				path: "/work/many",
			};
			const middle: CountedProject = {
				languages: [createLanguage("Go", 5, { blank: 3, comment: 5, complexity: 9, files: 3 })],
				path: "/work/middle",
			};

			function sortNames(key: SortKey, projects: ReadonlyArray<CountedProject>): ReadonlyArray<string> {
				return aggregateProjects("/work", projects, key).projects.map((project) => project.name);
			}

			it("should put the biggest first for every numeric key", ({ expect }) => {
				expect.assertions(5);

				const projects = [few, many, middle];

				expect(sortNames(SortKey.Code, projects)).toStrictEqual(["many", "middle", "few"]);
				expect(sortNames(SortKey.Files, projects)).toStrictEqual(["few", "middle", "many"]);
				expect(sortNames(SortKey.Blank, projects)).toStrictEqual(["many", "middle", "few"]);
				expect(sortNames(SortKey.Comment, projects)).toStrictEqual(["few", "middle", "many"]);
				expect(sortNames(SortKey.Complexity, projects)).toStrictEqual(["middle", "few", "many"]);
			});

			it("should break a tie by name", ({ expect }) => {
				expect.assertions(1);

				const tieB: CountedProject = { languages: [createLanguage("Go", 100)], path: "/work/b" };
				const tieA: CountedProject = { languages: [createLanguage("Go", 100)], path: "/work/a" };

				expect(sortNames(SortKey.Code, [tieB, many, tieA])).toStrictEqual(["a", "b", "many"]);
			});
		});

		it("should sort by name without regard to case", ({ expect }) => {
			expect.assertions(1);

			const { projects } = aggregateProjects("/work", [alpha, beta], SortKey.Name);

			expect(projects.map((project) => project.name)).toStrictEqual(["alpha", "Beta"]);
		});

		it("should drop a project that has no code", ({ expect }) => {
			expect.assertions(2);

			const empty: CountedProject = { languages: [], path: "/work/empty" };
			const { projects, total } = aggregateProjects("/work", [empty, alpha], SortKey.Code);

			expect(projects.map((project) => project.name)).toStrictEqual(["alpha"]);
			expect(total.projects).toBe(1);
		});

		it("should merge languages across projects in the total", ({ expect }) => {
			expect.assertions(1);

			const { total } = aggregateProjects("/work", [alpha, beta], SortKey.Code);

			expect(total).toStrictEqual({
				blank: 25,
				code: 450,
				comment: 30,
				complexity: 12,
				files: 6,
				languages: [
					{ name: "Rust", blank: 20, code: 300, comment: 30, complexity: 10, files: 3 },
					{ name: "TypeScript", blank: 5, code: 150, comment: 0, complexity: 2, files: 3 },
				],
				projects: 2,
			});
		});

		it("should name a project at the root by its full path", ({ expect }) => {
			expect.assertions(1);

			const atRoot: CountedProject = { languages: [createLanguage("Go", 1)], path: "/work" };

			expect(aggregateProjects("/work", [atRoot], SortKey.Code).projects[0]?.name).toBe("/work");
		});

		it("should report the root it was given", ({ expect }) => {
			expect.assertions(1);

			expect(aggregateProjects("/work", [alpha], SortKey.Code).root).toBe("/work");
		});
	});

	describe("serializeAggregate", () => {
		it("should print two-space JSON with keys in the order the fish version used", ({ expect }) => {
			expect.assertions(1);

			const rust = { name: "Rust", blank: 20, code: 300, comment: 30, complexity: 10, files: 3 };
			const aggregate = aggregateProjects("/work", [{ languages: [rust], path: "/work/alpha" }], SortKey.Code);

			function createLanguageLines(indent: string): ReadonlyArray<string> {
				return [
					`${indent}{`,
					`${indent}  "name": "Rust",`,
					`${indent}  "files": 3,`,
					`${indent}  "code": 300,`,
					`${indent}  "comment": 30,`,
					`${indent}  "blank": 20,`,
					`${indent}  "complexity": 10`,
					`${indent}}`,
				];
			}

			expect(serializeAggregate(aggregate).split("\n")).toStrictEqual([
				"{",
				'  "root": "/work",',
				'  "projects": [',
				"    {",
				'      "name": "alpha",',
				'      "path": "/work/alpha",',
				'      "files": 3,',
				'      "code": 300,',
				'      "comment": 30,',
				'      "blank": 20,',
				'      "complexity": 10,',
				'      "languages": [',
				...createLanguageLines(" ".repeat(8)),
				"      ]",
				"    }",
				"  ],",
				'  "total": {',
				'    "projects": 1,',
				'    "files": 3,',
				'    "code": 300,',
				'    "comment": 30,',
				'    "blank": 20,',
				'    "complexity": 10,',
				'    "languages": [',
				...createLanguageLines(" ".repeat(6)),
				"    ]",
				"  }",
				"}",
			]);
		});
	});
});
