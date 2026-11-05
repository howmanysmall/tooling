import { readdir, stat } from "node:fs/promises";
import nodePath from "node:path";

import { compareWithLocale } from "$utilities/string-utilities";

export async function listSubdirectoriesAsync(root: string): Promise<ReadonlyArray<string>> {
	const dirents = await readdir(root, { withFileTypes: true });
	const subdirectories = new Array<string>();
	let size = 0;

	for (const dirent of dirents) {
		if (dirent.name.startsWith(".")) continue;

		const path = nodePath.join(root, dirent.name);
		if (dirent.isDirectory()) {
			subdirectories[size++] = path;
			continue;
		}

		if (!dirent.isSymbolicLink()) continue;

		try {
			// oxlint-disable-next-line no-await-in-loop -- symlinks are rare, so this stays simple
			const target = await stat(path);
			if (target.isDirectory()) {
				subdirectories[size++] = path;
			}
		} catch {
			// A dangling link is not a project.
		}
	}

	return subdirectories.toSorted(compareWithLocale);
}
