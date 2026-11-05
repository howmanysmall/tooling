import nodePath from "node:path";

import { MANIFEST_NAMES, MANIFEST_SUFFIX, PRUNED_DIRECTORIES } from "$constants/manifest-constants";
import { compareWithLocale } from "$utilities/string-utilities";

function isManifest(fileName: string): boolean {
	return MANIFEST_NAMES.has(fileName) || fileName.endsWith(MANIFEST_SUFFIX);
}

export async function listManifestDirectoriesAsync(root: string, depth: number): Promise<ReadonlyArray<string>> {
	const manifests = await import("fdir").then(async ({ fdir }) => {
		return new fdir()
			.withFullPaths()
			.withMaxDepth(depth - 1)
			.exclude((directoryName) => PRUNED_DIRECTORIES.has(directoryName))
			.filter((path) => isManifest(nodePath.basename(path)))
			.crawl(root)
			.withPromise();
	});

	return [...new Set(manifests.map((manifest) => nodePath.dirname(manifest)))].toSorted(compareWithLocale);
}
