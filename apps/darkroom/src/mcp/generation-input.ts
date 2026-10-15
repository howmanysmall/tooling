import type { ReferenceImage } from "$generation/references";

import type { McpDependencies } from "./mcp-dependencies";

/**
 * Loads reference images, from paths relative to the client's directory or
 * from URLs.
 *
 * @param dependencies - How to load an image.
 * @param sources - The paths and URLs, if any.
 * @returns The images, in order.
 */
export async function loadReferencesAsync(
	dependencies: McpDependencies,
	sources: ReadonlyArray<string> | undefined,
): Promise<Array<ReferenceImage>> {
	return Promise.all((sources ?? []).map(async (source) => dependencies.loadReferenceAsync(source)));
}
