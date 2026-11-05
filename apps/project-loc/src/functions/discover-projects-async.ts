import { DiscoveryMode } from "$meta/discovery-mode";

import { findEnclosing } from "./find-enclosing";
import { listManifestDirectoriesAsync } from "./list-manifest-directories-async";
import { listSubdirectoriesAsync } from "./list-subdirectories-async";

export async function discoverProjectsAsync(
	root: string,
	discoveryMode: DiscoveryMode,
	depth: number,
	nested: boolean,
): Promise<ReadonlyArray<string>> {
	if (discoveryMode === DiscoveryMode.Subdirectories) return listSubdirectoriesAsync(root);

	const directories = await listManifestDirectoriesAsync(root, depth);
	if (nested) return directories;

	const kept = new Set<string>();
	for (const directory of directories) {
		if (findEnclosing(directory, kept) !== undefined) continue;
		kept.add(directory);
	}

	return [...kept];
}
