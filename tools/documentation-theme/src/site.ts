/** Where every documentation site is served from. */
export const DOCUMENTATION_ORIGIN = "https://docs.howmanysmall.com";

/**
 * The repository's GitHub Pages path. Each site is a folder under it, since a
 * repository has only one Pages deployment.
 */
export const REPOSITORY_PATH = "/tooling";

/** Where one documentation site lives. */
export interface DocumentationSite {
	/** The path the site is served under, without a trailing slash. */
	readonly base: string;
	/** The origin the site is served from. */
	readonly site: string;
	/** The site's full address, with a trailing slash. */
	readonly url: string;
}

/**
 * Works out where a documentation site lives from its folder name.
 *
 * @param name - The site's folder under `documentation/`, such as `darkroom`.
 * @returns The origin, base path, and full address of the site.
 */
export function getDocumentationSite(name: string): DocumentationSite {
	const base = `${REPOSITORY_PATH}/${name}`;
	return { base, site: DOCUMENTATION_ORIGIN, url: `${DOCUMENTATION_ORIGIN}${base}/` };
}
