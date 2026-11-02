import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import nodePath from "node:path";
import { isMaybeString, isString } from "@howmanysmall/arktype-utilities";
import { getDocumentationSite } from "@howmanysmall/documentation-theme/site";
import { type } from "arktype";

export const DOCUMENTATION_DIRECTORY = "documentation";

const isManifest = type({
	name: isString,
	"+": "ignore",
	"description?": isMaybeString,
});
const parseJson = type("string.json.parse");

/** One documentation site in the repository. */
export interface DocumentationSiteEntry {
	/** The site's folder under `documentation/`. */
	readonly name: string;
	/** What the site covers, from its `package.json`. */
	readonly description: string;
	/** Where the site is published. */
	readonly url: string;
}

/**
 * Reads one site's details from its folder.
 *
 * @param directory - The `documentation/` folder.
 * @param name - The site's folder name.
 * @returns The site, or `undefined` when the folder isn't a site.
 */
async function readSiteAsync(directory: string, name: string): Promise<DocumentationSiteEntry | undefined> {
	const manifestPath = nodePath.join(directory, name, "package.json");
	if (!existsSync(manifestPath)) return undefined;

	const { description = name } = isManifest.assert(parseJson.assert(await readFile(manifestPath, "utf8")));
	return { name, description, url: getDocumentationSite(name).url };
}

/**
 * Lists the documentation sites, one per folder under `documentation/` with
 * a `package.json`.
 *
 * @param rootDirectory - The repository root.
 * @returns The sites, by name.
 */
export async function getSitesAsync(rootDirectory: string): Promise<Array<DocumentationSiteEntry>> {
	const directory = nodePath.join(rootDirectory, DOCUMENTATION_DIRECTORY);
	const entries = await readdir(directory, { withFileTypes: true });
	const folders = entries.filter((entry) => entry.isDirectory());
	const sites = await Promise.all(folders.map(async (entry) => readSiteAsync(directory, entry.name)));
	return sites
		.filter((site) => site !== undefined)
		.toSorted((first, second) => first.name.localeCompare(second.name));
}
