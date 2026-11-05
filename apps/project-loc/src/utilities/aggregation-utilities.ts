import { JSON_KEY_ORDER } from "$constants/aggregation-constants";
import { SortKey } from "$meta/sort-key";

import { compareWithLocale, toAsciiLowerCase } from "./string-utilities";

import type { Aggregate, CountedProject, Counts, LanguageStats, ProjectStats } from "$types/code-types";

export function aggregateProjects(root: string, counted: ReadonlyArray<CountedProject>, sortKey: SortKey): Aggregate {
	const prefix = `${root.endsWith("/") ? root.slice(0, -1) : root}/`;

	const unsorted = new Array<ProjectStats>();
	let size = 0;
	for (const project of counted) {
		if (project.languages.length === 0) continue;

		const languages = project.languages.toSorted(compareLanguages);
		const { blank, code, comment, complexity, files } = sumCounts(languages);
		unsorted[size++] = {
			name: project.path.startsWith(prefix) ? project.path.slice(prefix.length) : project.path,
			blank,
			code,
			comment,
			complexity,
			files,
			languages,
			path: project.path,
		};
	}

	const projects = unsorted.toSorted(createProjectComparator(sortKey));
	const { blank, code, comment, complexity, files } = sumCounts(projects);

	return {
		projects,
		root,
		total: {
			blank,
			code,
			comment,
			complexity,
			files,
			languages: mergeLanguages(projects),
			projects: projects.length,
		},
	};
}

export function serializeAggregate(aggregate: Aggregate): string {
	return JSON.stringify(aggregate, [...JSON_KEY_ORDER], 2);
}

function sumCounts(languages: ReadonlyArray<Counts>): Counts {
	let blank = 0;
	let code = 0;
	let comment = 0;
	let complexity = 0;
	let files = 0;

	for (const language of languages) {
		blank += language.blank;
		code += language.code;
		comment += language.comment;
		complexity += language.complexity;
		files += language.files;
	}

	return { blank, code, comment, complexity, files };
}

function compareLanguages(left: LanguageStats, right: LanguageStats): number {
	return right.code - left.code || compareWithLocale(left.name, right.name);
}

function mergeLanguages(projects: ReadonlyArray<ProjectStats>): ReadonlyArray<LanguageStats> {
	const groups = new Map<string, Array<LanguageStats>>();
	for (const project of projects) {
		for (const language of project.languages) {
			const group = groups.get(language.name) ?? [];
			group.push(language);
			groups.set(language.name, group);
		}
	}

	const merged = new Array<LanguageStats>();
	for (const [name, group] of groups) {
		merged.push({ name, ...sumCounts(group) });
	}

	return merged.toSorted(compareLanguages);
}

function createProjectComparator(sortKey: SortKey): (left: ProjectStats, right: ProjectStats) => number {
	if (sortKey === SortKey.Name) {
		return function compare(left, right): number {
			return compareWithLocale(toAsciiLowerCase(left.name), toAsciiLowerCase(right.name));
		};
	}

	return function compare(left, right): number {
		return (
			right[sortKey] - left[sortKey] ||
			compareWithLocale(toAsciiLowerCase(left.name), toAsciiLowerCase(right.name))
		);
	};
}
