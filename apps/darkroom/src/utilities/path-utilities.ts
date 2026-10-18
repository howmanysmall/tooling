import { homedir } from "node:os";
import nodePath from "node:path";

import { EDGE_UNDERSCORES, NON_SLUG_REGEXP, REPEATED_UNDERSCORES } from "$constants";

/**
 * Shortens a path under the home directory to start with `~`.
 *
 * @param path - An absolute path.
 * @param home - The home directory.
 * @returns `~/…` for paths under `home`, otherwise the path unchanged.
 */
export function shortenHomePath(path: string, home = homedir()): string {
	if (path === home) return "~";

	return path.startsWith(`${home}${nodePath.sep}`) ? `~${path.slice(home.length)}` : path;
}

export function makeStringSafeForPath(value: string): string {
	return value
		.normalize("NFKD")
		.replaceAll(/\p{M}/gu, "")
		.replaceAll(NON_SLUG_REGEXP, "_")
		.replaceAll(REPEATED_UNDERSCORES, "_")
		.replaceAll(EDGE_UNDERSCORES, "");
}
