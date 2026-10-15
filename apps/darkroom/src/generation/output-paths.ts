import nodePath from "node:path";
import { toKebabCase } from "@howmanysmall/string-utilities/casing-utilities";

const COMBINING_MARKS = /\p{M}/gu;
const NON_SLUG_CHARACTERS = /[^\p{L}\p{N}-]+/gu;
const REPEATED_DASHES = /-{2,}/gu;
const EDGE_DASHES = /^-|-$/gu;
const MAX_SLUG_LENGTH = 40;
const FALLBACK_SLUG = "image";

/**
 * Turns a prompt into a short, file-name-safe slug.
 *
 * @param prompt - The prompt text.
 * @returns A kebab-case slug of at most 40 characters, cut at a word
 *   boundary, or `image` when nothing usable is left.
 */
export function slugify(prompt: string): string {
	const slug = toKebabCase(prompt.normalize("NFKD").replaceAll(COMBINING_MARKS, ""))
		.replaceAll(NON_SLUG_CHARACTERS, "-")
		.replaceAll(REPEATED_DASHES, "-")
		.replaceAll(EDGE_DASHES, "");

	if (slug.length <= MAX_SLUG_LENGTH) return slug.length === 0 ? FALLBACK_SLUG : slug;

	const cut = slug.slice(0, MAX_SLUG_LENGTH + 1);
	const boundary = cut.lastIndexOf("-");
	return boundary > 0 ? cut.slice(0, boundary) : slug.slice(0, MAX_SLUG_LENGTH);
}

/**
 * Formats a date as local `YYYY-MM-DD`.
 *
 * @param date - The date to format.
 * @returns The local calendar date.
 */
export function formatLocalDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export const enum OutputKind {
	Directory = "directory",
	File = "file",
	Stdout = "stdout",
}

export type OutputSpec =
	| {
			readonly directory: string;
			readonly kind: OutputKind.Directory;
			/** Replaces `<date>_<slug>` in generated names, such as a model name. */
			readonly stem?: string | undefined;
	  }
	| { readonly kind: OutputKind.File; readonly path: string }
	| { readonly kind: OutputKind.Stdout };

/**
 * Interprets the `-o` value.
 *
 * @param output - The `-o` value, if any.
 * @param cwd - The current working directory.
 * @param isExistingDirectory - Whether `output` names an existing directory.
 * @returns Where the images go.
 */
export function parseOutputSpec(output: string | undefined, cwd: string, isExistingDirectory: boolean): OutputSpec {
	if (output === undefined) {
		return { directory: cwd, kind: OutputKind.Directory };
	}

	if (output === "-") {
		return { kind: OutputKind.Stdout };
	}

	const resolved = nodePath.resolve(cwd, output);
	if (isExistingDirectory || output.endsWith("/") || output.endsWith(nodePath.sep)) {
		return { directory: resolved, kind: OutputKind.Directory };
	}

	return { kind: OutputKind.File, path: resolved };
}

export interface OutputNaming {
	/** The number of images in the run. */
	readonly count: number;
	/** The local date, as `YYYY-MM-DD`. */
	readonly date: string;
	/** The extension, without a dot. */
	readonly extension: string;
	/** The 1-based image number. */
	readonly index: number;
	readonly slug: string;
}

/**
 * Gets the path for one image before any collision suffix is added.
 *
 * @param spec - Where the images go. Must not be stdout.
 * @param naming - The parts of the generated name.
 * @returns The absolute path.
 */
export function getOutputPath(
	spec: Exclude<OutputSpec, { readonly kind: OutputKind.Stdout }>,
	naming: OutputNaming,
): string {
	if (spec.kind === OutputKind.Directory) {
		const stem = spec.stem ?? `${naming.date}_${naming.slug}`;
		return nodePath.join(spec.directory, `${stem}_${naming.index}.${naming.extension}`);
	}

	const extension = nodePath.extname(spec.path);
	const stem = extension === "" ? spec.path : spec.path.slice(0, -extension.length);
	const finalExtension = extension === "" ? `.${naming.extension}` : extension;
	return naming.count === 1 ? `${stem}${finalExtension}` : `${stem}_${naming.index}${finalExtension}`;
}

/**
 * Adds a `-N` suffix before the extension, for picking a free name.
 *
 * @param path - The preferred path.
 * @param attempt - 1 for the path itself, 2 or more for `-2`, `-3`, ….
 * @returns The candidate path.
 */
export function addCollisionSuffix(path: string, attempt: number): string {
	if (attempt <= 1) return path;
	const extension = nodePath.extname(path);
	return `${path.slice(0, path.length - extension.length)}-${attempt}${extension}`;
}
