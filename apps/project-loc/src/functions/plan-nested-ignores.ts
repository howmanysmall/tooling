import { escapeIgnorePattern } from "./escape-ignore-pattern";
import { findEnclosing } from "./find-enclosing";

export function planNestedIgnores(
	allProjects: ReadonlyArray<string>,
	selected: ReadonlyArray<string>,
): Map<string, ReadonlyArray<string>> {
	const everything = new Set(allProjects);
	const counted = new Set(selected);
	const plan = new Map<string, Array<string>>();

	for (const project of allProjects) {
		const parent = findEnclosing(project, everything);
		if (parent === undefined || !counted.has(parent)) continue;

		const relativePath = project.slice(parent.length + 1);
		const patterns = plan.get(parent) ?? [];
		patterns.push(`/${escapeIgnorePattern(relativePath)}/`);
		plan.set(parent, patterns);
	}

	return plan;
}
