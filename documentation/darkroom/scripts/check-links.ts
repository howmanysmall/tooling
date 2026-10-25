// oxlint-disable eslint/no-script-url -- names a skipped URL scheme.
import { readdirSync, readFileSync, statSync } from "node:fs";
import nodePath from "node:path";
import { argv, stdout } from "node:process";

/** A dead internal reference and where it was found. */
interface DeadLink {
	readonly page: string;
	readonly reason: string;
	readonly reference: string;
}

/** A reference split into its path and fragment. */
interface SplitReference {
	readonly fragment: string;
	readonly path: string;
}

/** Why a reference leaves the site. */
interface ResolutionError {
	readonly error: string;
}

/** A reference resolved to a file under the site root. */
interface ResolvedFile {
	readonly file: string;
}

/** A reference resolution. */
type ResolveResult = ResolutionError | ResolvedFile;

/** A finished link check. */
interface CheckResult {
	readonly checked: number;
	readonly dead: Array<DeadLink>;
	readonly pages: number;
}

/** An HTML tag and attribute that can carry a local reference. */
const REFERENCE_PATTERN = /<(?<tag>a|img|script|link)\b[^>]*?\b(?:href|src)="(?<reference>[^"]*)"/giu;

/** Every `id` in a page, for fragment checks. */
const ID_PATTERN = /\sid="(?<identifier>[^"]*)"/gu;

/** Leading slashes, stripped when mapping an absolute path into `dist/`. */
const LEADING_SLASHES_PATTERN = /^\/+/u;

const SKIPPED_PREFIXES: ReadonlyArray<string> = [
	"http://",
	"https://",
	"//",
	"mailto:",
	"tel:",
	"data:",
	"javascript:",
	"blob:",
];

/**
 * Lists every HTML file under a directory.
 *
 * @param directory - The directory to walk.
 * @returns The HTML file paths.
 */
function listHtmlFiles(directory: string): Array<string> {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = nodePath.join(directory, entry.name);
		if (entry.isDirectory()) return listHtmlFiles(path);
		return entry.name.endsWith(".html") ? [path] : [];
	});
}

/**
 * Splits a reference into its path and fragment.
 *
 * @param reference - The raw `href` or `src` value.
 * @returns The path and the fragment, without their separators.
 */
function splitReference(reference: string): SplitReference {
	const hash = reference.indexOf("#");
	if (hash === -1) {
		return { fragment: "", path: reference };
	}

	return { fragment: reference.slice(hash + 1), path: reference.slice(0, hash) };
}

/**
 * Whether a reference is checkable rather than external or special-cased.
 *
 * @param reference - The raw `href` or `src` value.
 * @returns Whether the checker follows it.
 */
function isCheckable(reference: string): boolean {
	return reference.length > 0 && SKIPPED_PREFIXES.every((prefix) => !reference.startsWith(prefix));
}

/**
 * Whether a path is a file.
 *
 * @param path - The path to test.
 * @returns Whether it exists as a file.
 */
function isFile(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}

/**
 * Resolves a reference to a file under the site root.
 *
 * @param reference - The raw `href` or `src` value.
 * @param pageFile - The HTML file containing it.
 * @param root - The built site directory.
 * @param base - The path the site is served under.
 * @returns The resolved file, or why it leaves the site.
 */
function resolveReference(reference: string, pageFile: string, root: string, base: string): ResolveResult {
	const { path } = splitReference(reference);
	if (path.length === 0) {
		return { file: pageFile };
	}

	if (path.startsWith("/")) return resolveAbsoluteReference(path, root, base);
	return resolveRelativeReference(path, pageFile, root);
}

/**
 * Resolves an absolute reference, which must stay under the site base.
 *
 * @param path - The URL path, starting with a slash.
 * @param root - The built site directory.
 * @param base - The path the site is served under.
 * @returns The resolved file, or why it leaves the site.
 */
function resolveAbsoluteReference(path: string, root: string, base: string): ResolveResult {
	if (path !== base && !path.startsWith(`${base}/`)) {
		return { error: `leaves the site base ${base}` };
	}

	return toIndexFile(root, path.slice(base.length).replace(LEADING_SLASHES_PATTERN, ""));
}

/**
 * Resolves a relative reference, which must stay under the site root.
 *
 * @param path - The URL path, relative to the page.
 * @param pageFile - The HTML file containing it.
 * @param root - The built site directory.
 * @returns The resolved file, or why it leaves the site.
 */
function resolveRelativeReference(path: string, pageFile: string, root: string): ResolveResult {
	const pageDirectory = nodePath.posix.dirname(toPosixPath(pageFile));
	const rootPosix = toPosixPath(root);
	const relative = nodePath.posix.relative(rootPosix, nodePath.posix.resolve(pageDirectory, path));

	if (relative.startsWith("..")) {
		return { error: "escapes the site root" };
	}

	return toIndexFile(root, relative);
}

/**
 * Turns a path under the site root into its file, using a directory's index
 * page when the path names a directory.
 *
 * @param root - The built site directory.
 * @param relative - The path under the site root.
 * @returns The resolved file.
 */
function toIndexFile(root: string, relative: string): ResolvedFile {
	const file = nodePath.join(root, decodePath(relative));
	try {
		if (statSync(file).isDirectory()) {
			return { file: nodePath.join(file, "index.html") };
		}
	} catch {
		// A missing target is reported by the caller.
	}

	return { file };
}

/**
 * Rewrites a path with forward slashes, so resolving references and printing
 * results behave the same on every platform.
 *
 * @param path - A file system path, possibly with separators.
 * @returns The path with forward slashes.
 */
function toPosixPath(path: string): string {
	return path.split(nodePath.sep).join(nodePath.posix.sep);
}

/**
 * Decodes a URL path, falling back to the raw text when it is malformed.
 *
 * @param path - The URL path.
 * @returns The decoded path.
 */
function decodePath(path: string): string {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/**
 * Reads the cached `id` attributes of a page.
 *
 * @param file - The HTML file.
 * @param cache - The ids found so far, by file.
 * @returns The page's ids.
 */
function readIds(file: string, cache: Map<string, Array<string>>): Array<string> {
	const cached = cache.get(file);
	if (cached !== undefined) return cached;

	try {
		const html = readFileSync(file, "utf8");
		const ids = Array.from(html.matchAll(ID_PATTERN), (match) => match.groups?.identifier ?? "");
		cache.set(file, ids);
		return ids;
	} catch {
		const ids: Array<string> = [];
		cache.set(file, ids);
		return ids;
	}
}

/**
 * Checks one page's references.
 *
 * @param pageFile - The HTML file to check.
 * @param root - The built site directory.
 * @param base - The path the site is served under.
 * @param idsByFile - The id cache.
 * @returns The dead references found.
 */
function checkPage(
	pageFile: string,
	root: string,
	base: string,
	idsByFile: Map<string, Array<string>>,
): Array<DeadLink> {
	const dead: Array<DeadLink> = [];
	const html = readFileSync(pageFile, "utf8");
	for (const match of html.matchAll(REFERENCE_PATTERN)) {
		const reference = getReference(match);
		if (!isCheckable(reference)) continue;

		const reason = findDeadReason(reference, pageFile, root, base, idsByFile);
		if (reason !== undefined) {
			dead.push({ page: pageFile, reason, reference });
		}
	}

	return dead;
}

/**
 * Reads the reference from a regular expression match.
 *
 * @param match - A `REFERENCE_PATTERN` match.
 * @returns The raw `href` or `src` value.
 */
function getReference(match: RegExpMatchArray): string {
	return match.groups?.reference ?? "";
}

/**
 * Finds why a checkable reference is dead.
 *
 * @param reference - The raw `href` or `src` value.
 * @param pageFile - The HTML file containing it.
 * @param root - The built site directory.
 * @param base - The path the site is served under.
 * @param idsByFile - The id cache.
 * @returns Why the reference is dead, or undefined when it resolves.
 */
function findDeadReason(
	reference: string,
	pageFile: string,
	root: string,
	base: string,
	idsByFile: Map<string, Array<string>>,
): string | undefined {
	const resolved = resolveReference(reference, pageFile, root, base);
	if ("error" in resolved) return resolved.error;
	if (!isFile(resolved.file)) return "target is missing";
	return findFragmentProblem(resolved.file, splitReference(reference).fragment, idsByFile);
}

/**
 * Finds why a fragment is missing from its target page.
 *
 * @param file - The resolved target file.
 * @param fragment - The fragment to look for.
 * @param idsByFile - The id cache.
 * @returns Why the fragment is missing, or undefined when it exists.
 */
function findFragmentProblem(
	file: string,
	fragment: string,
	idsByFile: Map<string, Array<string>>,
): string | undefined {
	if (fragment.length === 0) return undefined;
	return readIds(file, idsByFile).includes(decodePath(fragment)) ? undefined : "fragment is missing";
}

/**
 * Checks every built page for dead internal references.
 *
 * @param root - The built site directory.
 * @param base - The path the site is served under.
 * @returns The dead references found, with check totals.
 */
function checkLinks(root: string, base: string): CheckResult {
	const pages = listHtmlFiles(root);
	const idsByFile = new Map<string, Array<string>>();
	const dead = pages.flatMap((page) => checkPage(page, root, base, idsByFile));
	const checked = pages.reduce((count, page) => count + countCheckable(page), 0);
	return { checked, dead, pages: pages.length };
}

/**
 * Counts a page's checkable references.
 *
 * @param pageFile - The HTML file to count.
 * @returns How many references the checker follows.
 */
function countCheckable(pageFile: string): number {
	const html = readFileSync(pageFile, "utf8");
	const references = Array.from(html.matchAll(REFERENCE_PATTERN), (match) => match.groups?.reference ?? "");
	// oxlint-disable-next-line unicorn/no-array-callback-reference -- `isCheckable` is a predicate.
	return references.filter(isCheckable).length;
}

const commandLineArguments = argv.slice(2);
const positionals: Array<string> = [];
let base = "/tooling/darkroom";
const entries = commandLineArguments.entries();

for (const [index, commandLineArgument] of entries) {
	if (commandLineArgument === "--base") {
		base = commandLineArguments[index + 1] ?? base;
	} else if (commandLineArguments[index - 1] !== "--base" && !commandLineArgument.startsWith("--")) {
		positionals.push(commandLineArgument);
	}
}

const [directory = "dist"] = positionals;

const { checked, dead, pages } = checkLinks(directory, base);

for (const { page, reason, reference } of dead) {
	stdout.write(`${toPosixPath(page)}: ${reference} (${reason})\n`);
}

if (dead.length > 0) {
	throw new Error(`Found ${dead.length} dead links.`);
} else {
	stdout.write(`Checked ${checked} references across ${pages} pages: no dead links.\n`);
}
