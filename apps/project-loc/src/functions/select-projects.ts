import nodePath from "node:path";

export function selectProjects(
	projects: ReadonlyArray<string>,
	root: string,
	names: ReadonlyArray<string>,
): ReadonlyArray<string> {
	if (names.length === 0) return projects;

	const wanted = new Set(names);
	const prefix = `${root}/`;
	return projects.filter((project) => {
		const relativeName = project.startsWith(prefix) ? project.slice(prefix.length) : project;
		return wanted.has(relativeName) || wanted.has(nodePath.basename(project));
	});
}
