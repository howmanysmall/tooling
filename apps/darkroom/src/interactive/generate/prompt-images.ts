import { statSync } from "node:fs";
import { homedir } from "node:os";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";

import { REFERENCE_EXTENSIONS } from "$generation/media-types";

/** An image pasted into the prompt, which the text refers to as `[Image 1]`. */
export interface PromptImage {
	readonly number: number;
	readonly path: string;
}

/** A prompt ready to send: its references, and its text numbered to match. */
export interface ResolvedPromptImages {
	readonly paths: ReadonlyArray<string>;
	readonly prompt: string;
}

const IMAGE_TOKEN = /\[Image (\d+)\]/gu;
// A quoted word, or a word with its spaces escaped, as terminals paste paths.
const SHELL_WORD = /'[^']*'|"(?:[^"\\]|\\.)*"|(?:\\.|[^\s\\])+/gu;

export function formatImageToken(number: number): string {
	return `[Image ${number}]`;
}

function isImageFile(path: string): boolean {
	if (!REFERENCE_EXTENSIONS.has(nodePath.extname(path).toLowerCase())) return false;
	return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

function unquote(word: string): string {
	const quote = word.charAt(0);
	if (word.length >= 2 && (quote === "'" || quote === '"') && word.endsWith(quote)) {
		return quote === "'" ? word.slice(1, -1) : word.slice(1, -1).replaceAll(/\\(.)/gu, "$1");
	}

	return word.replaceAll(/\\(.)/gu, "$1");
}

function toPath(word: string): string {
	const path = unquote(word);
	if (path.startsWith("file://")) return fileURLToPath(path);
	return path.startsWith("~/") ? nodePath.join(homedir(), path.slice(2)) : path;
}

/**
 * Reads pasted text as image files, the way terminals paste them: bare,
 * quoted, with escaped spaces, as a `file://` URL, or several at once. Text
 * that only mentions a path is a prompt, so every word has to be an image.
 *
 * @param text - What was pasted.
 * @param isImage - Whether a path is an image file, for tests.
 * @returns The paths, or `undefined` when the paste is ordinary text.
 */
export function parsePastedImagePaths(text: string, isImage = isImageFile): ReadonlyArray<string> | undefined {
	const trimmed = text.trim();
	if (trimmed.length === 0) return undefined;

	// A copied path can hold bare spaces, which splitting would break.
	const whole = toPath(trimmed);
	if (isImage(whole)) return [whole];

	const paths = (trimmed.match(SHELL_WORD) ?? []).map(toPath);
	return paths.length > 0 && paths.every((path) => isImage(path)) ? paths : undefined;
}

/**
 * Finds the images the prompt still refers to, and renumbers its tokens by
 * where each image lands in the request, so `[Image 1]` names the first image
 * the model sees. A token deleted from the prompt drops its image.
 *
 * @param text - The prompt.
 * @param images - The images pasted into it.
 * @param firstPosition - The position of the first of them: `2` when the image
 *   being edited goes first.
 * @returns The paths to send, and the prompt to send with them.
 */
export function resolvePromptImages(
	text: string,
	images: ReadonlyArray<PromptImage>,
	firstPosition: number,
): ResolvedPromptImages {
	const used = images.filter(({ number }) => text.includes(formatImageToken(number)));
	const prompt = text.replaceAll(IMAGE_TOKEN, (token, digits: string) => {
		const index = used.findIndex(({ number }) => number === Number(digits));
		return index === -1 ? token : formatImageToken(firstPosition + index);
	});

	return { paths: used.map(({ path }) => path), prompt };
}
