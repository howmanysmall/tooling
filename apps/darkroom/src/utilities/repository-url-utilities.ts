import { regex } from "arktype";
import { Predicate } from "effect";
import { defineMacro } from "unplugin-macros";

import type { PackageJson } from "type-fest";

const FORGE_HOSTS = {
	bitbucket: "https://bitbucket.org",
	gist: "https://gist.github.com",
	github: "https://github.com",
	gitlab: "https://gitlab.com",
} as const satisfies Record<string, string>;

// oxlint-disable-next-line small-rules/no-known-value-widening -- needs to be imprecise
const SUBDIRECTORY_SEGMENT: Record<string, string> = {
	"bitbucket.org": "src",
	"github.com": "tree",
	"gitlab.com": "tree",
};

// oxlint-disable-next-line unicorn/prefer-string-raw -- arkregex
const SHORTHANDS_REGEXP = regex("^(?:git\\+)?(?<host>github|gitlab|bitbucket|gist):(?<rest>.+)$", "u");
const START_WITH_GIT_REGEXP = /^git\+/u;
const ENDS_WITH_GIT_REGEXP = /\.git$/u;

export function getRepositoryUrl(repository: PackageJson["repository"]): undefined | URL {
	if (repository === undefined) return undefined;

	const raw = Predicate.isString(repository) ? repository : repository.url;
	const shorthand = SHORTHANDS_REGEXP.exec(raw);

	const href =
		shorthand === null
			? raw.replace(START_WITH_GIT_REGEXP, "")
			: `${FORGE_HOSTS[shorthand.groups.host]}${shorthand.groups.rest}`;

	try {
		return new URL(href.replace(ENDS_WITH_GIT_REGEXP, ""));
	} catch {
		return undefined;
	}
}

const START_OF_STRING_REGEXP = /^/u;

export function getAppUrl(repository: PackageJson["repository"], ref = "main"): undefined | URL {
	if (repository === undefined) return undefined;

	const url = getRepositoryUrl(repository);
	if (url === undefined) return undefined;

	if (!Predicate.isString(repository) && repository.directory !== undefined) {
		const segment = SUBDIRECTORY_SEGMENT[url.hostname];
		url.pathname = [...url.pathname.split("/").filter(Boolean), segment ?? "tree", ref, repository.directory]
			.join("/")
			.replace(START_OF_STRING_REGEXP, "/");
	}

	return url;
}

export const getRepositoryUrlAsync = defineMacro(async function getRepositoryUrlAsync(): Promise<string | undefined> {
	const { repository } = await import("$constants");
	return getAppUrl(repository)?.toString();
});
