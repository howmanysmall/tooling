import nodePath from "node:path";

export function findEnclosing(directory: string, candidates: ReadonlySet<string>): string | undefined {
	let ancestor = nodePath.dirname(directory);
	while (true) {
		if (candidates.has(ancestor)) return ancestor;

		const parent = nodePath.dirname(ancestor);
		if (parent === ancestor) return undefined;
		ancestor = parent;
	}
}
