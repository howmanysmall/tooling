import nodePath from "node:path";
import picomatch from "picomatch";

const TSCONFIG_JSON = "tsconfig.json";

export interface Reference {
	readonly path: string;
}

export interface Project {
	/** Unset for a package.json without a `name`; nothing can depend on it. */
	readonly name: string | undefined;
	/** Workspace-relative with POSIX separators, such as `apps/footnote`. */
	readonly directory: string;
	readonly references: ReadonlyArray<Reference>;
	/** Names of the `workspace:` dependencies in its package.json. */
	readonly workspaceDependencies: ReadonlyArray<string>;
}

export interface Edit {
	readonly add: ReadonlyArray<string>;
	/** Workspace-relative with POSIX separators, such as `tsconfig.json`. */
	readonly file: string;
	/** Spelled as they are in the file. */
	readonly remove: ReadonlyArray<string>;
}

export interface PlanOptions {
	/** The configured `ignore` globs. */
	readonly ignore: ReadonlyArray<string>;
	readonly projects: ReadonlyArray<Project>;
	/** The root tsconfig's references, or `undefined` if it does not exist. */
	readonly rootReferences: ReadonlyArray<Reference> | undefined;
	/** The `packages` globs from `pnpm-workspace.yaml`. */
	readonly workspaceGlobs: ReadonlyArray<string>;
}

function comparePaths(pathA: string, pathB: string): number {
	if (pathA < pathB) return -1;
	return pathA > pathB ? 1 : 0;
}

function normalizePath(path: string): string {
	const normalized = nodePath.posix.normalize(path);
	return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toTarget(directory: string, path: string): string {
	const joined = normalizePath(nodePath.posix.join(directory, path));
	return nodePath.posix.basename(joined) === TSCONFIG_JSON ? nodePath.posix.dirname(joined) : joined;
}

function toReferencePath(directory: string, target: string): string {
	const relative = nodePath.posix.relative(directory, target);
	return relative === ".." || relative.startsWith("../") ? relative : `./${relative}`;
}

function planFile(
	directory: string,
	references: ReadonlyArray<Reference>,
	expected: ReadonlySet<string>,
	isManaged: (target: string) => boolean,
): Edit | undefined {
	const targetsByPath = new Map(references.map(({ path }) => [path, toTarget(directory, path)]));
	const targets = new Set(targetsByPath.values());

	const add = new Array<string>();
	for (const target of expected) {
		if (!targets.has(target)) {
			add.push(toReferencePath(directory, target));
		}
	}

	const remove = new Array<string>();
	for (const [path, target] of targetsByPath) {
		if (!expected.has(target) && isManaged(target)) {
			remove.push(path);
		}
	}

	if (add.length === 0 && remove.length === 0) return undefined;

	return {
		add: add.toSorted(comparePaths),
		file: nodePath.posix.join(directory, TSCONFIG_JSON),
		remove: remove.toSorted(comparePaths),
	};
}

/**
 * Works out what each tsconfig needs added or removed. A reference is managed
 * when it targets a project, or a directory a workspace glob covers that is
 * neither ignored, negated, nor a project, which is what a deleted package
 * looks like. Every other reference is hand-owned and is never removed.
 *
 * @param options - The workspace to plan for.
 * @param options.ignore - The configured `ignore` globs.
 * @param options.projects - The discovered projects.
 * @param options.rootReferences - The root tsconfig's references, if it exists.
 * @param options.workspaceGlobs - The `packages` globs, including negations.
 * @returns One edit per stale file, sorted by file.
 */
export function planEdits({ ignore, projects, rootReferences, workspaceGlobs }: PlanOptions): ReadonlyArray<Edit> {
	const projectDirectories = new Set(projects.map(({ directory }) => directory));
	const directoriesByName = new Map(projects.map(({ name, directory }) => [name, directory]));

	const positiveGlobs = new Array<string>();
	const excludedGlobs = ["**/node_modules/**", ...ignore.map((glob) => normalizePath(glob))];
	for (const glob of workspaceGlobs) {
		if (glob.startsWith("!")) {
			excludedGlobs.push(normalizePath(glob.slice(1)));
		} else if (normalizePath(glob) !== ".") {
			positiveGlobs.push(normalizePath(glob));
		}
	}

	const matchesWorkspace = picomatch(positiveGlobs, { ignore: excludedGlobs });

	function isManaged(target: string): boolean {
		// A file such as `tsconfig.lib.json` is never a project, even under `**`.
		return projectDirectories.has(target) || (!target.endsWith(".json") && matchesWorkspace(target));
	}

	const edits = projects.map(({ name, directory, references, workspaceDependencies }) => {
		const expected = new Set<string>();
		for (const dependency of workspaceDependencies) {
			const dependencyDirectory = directoriesByName.get(dependency);
			if (dependency !== name && dependencyDirectory !== undefined) {
				expected.add(dependencyDirectory);
			}
		}

		return planFile(directory, references, expected, isManaged);
	});

	if (rootReferences !== undefined) {
		edits.push(planFile(".", rootReferences, projectDirectories, isManaged));
	}

	return edits.filter((edit) => edit !== undefined).toSorted((editA, editB) => comparePaths(editA.file, editB.file));
}

/**
 * Computes a file's final references. Kept references retain their spelling
 * and extra fields.
 *
 * @param references - The file's current references.
 * @param edit - The edit to apply.
 * @param edit.add - The paths to add.
 * @param edit.remove - The paths to remove, as spelled in the file.
 * @returns The new references, sorted by path in byte order.
 */
export function applyEdit(references: ReadonlyArray<Reference>, { add, remove }: Edit): ReadonlyArray<Reference> {
	const removed = new Set(remove);
	const kept = references.filter(({ path }) => !removed.has(path));

	return [...kept, ...add.map((path) => ({ path }))].toSorted((referenceA, referenceB) =>
		comparePaths(referenceA.path, referenceB.path),
	);
}
