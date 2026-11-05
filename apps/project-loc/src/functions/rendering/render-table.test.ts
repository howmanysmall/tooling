import { describe, it } from "vitest";

import { SortKey } from "$meta/sort-key";
import { aggregateProjects } from "$utilities/aggregation-utilities";

import { renderTable } from "./render-table";

import type { Aggregate, CountedProject } from "$types/code-types";

const DASH_CELL = / {2}-$/u;

describe("renderTable", () => {
	const alpha: CountedProject = {
		languages: [{ name: "Rust", blank: 20, code: 300, comment: 30, complexity: 10, files: 3 }],
		path: "/work/alpha",
	};
	const beta: CountedProject = {
		languages: [{ name: "TypeScript", blank: 5, code: 100, comment: 0, complexity: 2, files: 1 }],
		path: "/work/beta",
	};
	const aggregate = aggregateProjects("/work", [alpha, beta], SortKey.Code);

	it("should lay out a header, the projects, and a total", ({ expect }) => {
		expect.assertions(1);

		const gap = "  ";
		const rule = "─".repeat(92);
		const expected = [
			[
				"PROJECT           ",
				"FILES",
				"CODE",
				"COMMENT",
				"BLANK",
				"COMPLEXITY",
				`SHARE${" ".repeat(12)}`,
				"TOP LANGUAGE",
			].join(gap),
			rule,
			["alpha             ", "    3", " 300", "     30", "   20", "        10", "━━━━━━━━━━  75.0%", "Rust"].join(
				gap,
			),
			[
				"beta              ",
				"    1",
				" 100",
				"      0",
				"    5",
				"         2",
				"━━━╸──────  25.0%",
				"TypeScript",
			].join(gap),
			rule,
			["Total (2 projects)", "    4", " 400", "     30", "   25", "        12", "━━━━━━━━━━ 100.0%", "Rust"].join(
				gap,
			),
		];

		expect(renderTable(aggregate, { color: false, withLanguages: false }).split("\n")).toStrictEqual(expected);
	});

	it("should list the languages under each project and under the total", ({ expect }) => {
		expect.assertions(2);

		const lines = renderTable(aggregate, { color: false, withLanguages: true }).split("\n");

		expect(lines.map((line) => line.trimEnd().split("  ").find(Boolean))).toStrictEqual([
			"PROJECT",
			"─".repeat(92),
			"alpha",
			"└ Rust",
			"beta",
			"└ TypeScript",
			"─".repeat(92),
			"Total (2 projects)",
			"├ Rust",
			"└ TypeScript",
		]);
		expect(lines.at(-1)).toContain(" 25.0%");
	});

	it("should add no escape codes when color is off", ({ expect }) => {
		expect.assertions(1);

		expect(renderTable(aggregate, { color: false, withLanguages: true })).not.toContain("\u001B");
	});

	it("should add escape codes when color is on", ({ expect }) => {
		expect.assertions(1);

		expect(renderTable(aggregate, { color: true, withLanguages: false })).toContain("\u001B[");
	});

	it("should say 'project' for a single project", ({ expect }) => {
		expect.assertions(1);

		const single = aggregateProjects("/work", [alpha], SortKey.Code);

		expect(renderTable(single, { color: false, withLanguages: false })).toContain("Total (1 project)");
	});

	it("should put a dash in TOP LANGUAGE when there is nothing to count", ({ expect }) => {
		expect.assertions(2);

		const empty = aggregateProjects("/work", [], SortKey.Code);
		const total = renderTable(empty, { color: false, withLanguages: false }).split("\n").at(-1);

		expect(total).toContain("Total (0 projects)");
		expect(total).toMatch(DASH_CELL);
	});

	it("should put a dash in TOP LANGUAGE for a project with no counted languages", ({ expect }) => {
		expect.assertions(2);

		const emptyProject: Aggregate = {
			projects: [
				{
					name: "empty",
					blank: 0,
					code: 0,
					comment: 0,
					complexity: 0,
					files: 0,
					languages: [],
					path: "/work/empty",
				},
			],
			root: "/work",
			total: {
				blank: 0,
				code: 0,
				comment: 0,
				complexity: 0,
				files: 0,
				languages: [],
				projects: 1,
			},
		};
		const lines = renderTable(emptyProject, { color: false, withLanguages: false }).split("\n");

		expect(lines.find((line) => line.startsWith("empty"))).toMatch(DASH_CELL);
		expect(lines.at(-1)).toMatch(DASH_CELL);
	});
});
