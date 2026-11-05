// oxlint-disable unicorn/prefer-string-raw -- arktype regex

import { existsSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { argv } from "node:process";
import { isMaybeString } from "@howmanysmall/arktype-utilities";
import { Ansis } from "ansis";
import { regex, type } from "arktype";

import { defineMacro } from "./define-macro.ts";

import type { MacroContext } from "unplugin-macros";

// Highlighting is baked into the bundle at build time, so it cannot depend on
// the build machine's TTY, `NO_COLOR`, or `TERM`. Level 1 is the plain 16-color
// palette the runtime would have used anyway, so the result is identical to the
// unbundled behavior in a color-capable terminal.
const ansi = new Ansis(1);

const LINE_BREAK_PATTERN = /\r?\n/u;
const FENCE_PATTERN = regex("^\\s*(?<marker>`{3,}|~{3,})", "u");
const HEADING_PATTERN = regex("^(?<hashes>#{1,6})\\s+(?<content>\\S.*)$", "u");
const QUOTE_PATTERN = regex("^>\\s?(?<content>\\S.*)$", "u");
const BULLET_PATTERN = regex("^(?<marker>[-*+])\\s+(?<content>\\S.*)$", "u");
const ORDERED_PATTERN = regex("^(?<marker>\\d+\\.)\\s+(?<content>\\S.*)$", "u");
const HORIZONTAL_RULE_PATTERN = regex("^\\s*(?:-{3,}|\\*{3,}|_{3,})\\s*$", "u");
const INLINE_PATTERN = regex("(?<token>\\*\\*.+?\\*\\*|\\*.+?\\*|~~.+?~~|`[^`]+`|\\[[^\\]]+\\]\\([^)]+\\))", "gu");
const INLINE_FLAG_PATTERN = regex("^--?[A-Za-z][\\w-]*(?:=.*)?$", "u");
const COMMAND_BINARY_PATTERN = /^[A-Za-z0-9][\w:./-]*$/u;
const COMMAND_ARG_HINT_PATTERN = /[-.:/'"]/u;
const COMMAND_TOKEN_PATTERN = /\s+|(?:'[^']*'|"[^"]*"|\S)+/gu;
const QUOTED_PATTERN = /^(?:'[^']*'|"[^"]*")$/u;
const BARE_COMMAND_PATTERN = /^\s*[a-z][\w-]*\s+\S[^`]*[^\s.,;:!?`]$/u;

// Bare lines like `brew install scc` carry no flag, quote, or path to tell them
// apart from a lowercase sentence, so a leading well-known CLI is the signal.
const KNOWN_COMMANDS: ReadonlySet<string> = new Set([
	"apk",
	"apt",
	"apt-get",
	"asdf",
	"aube",
	"brew",
	"bun",
	"bunx",
	"cargo",
	"choco",
	"curl",
	"deno",
	"dnf",
	"docker",
	"flatpak",
	"gh",
	"git",
	"go",
	"mise",
	"nix",
	"node",
	"npm",
	"npx",
	"pacman",
	"pip",
	"pipx",
	"pnpm",
	"pnpx",
	"rustup",
	"scoop",
	"snap",
	"sudo",
	"uv",
	"uvx",
	"wget",
	"winget",
	"yarn",
	"yum",
	"zypper",
]);

const PROSE_TOKEN_PATTERN =
	/(?<![\w-])(?<flag>--?[A-Za-z][\w-]*)(?<value>=[^\s,;)]*)?|(?<![\w.])(?<number>\d+(?:[.,]\d+)*[A-Za-z%]*)(?!\w)/gu;
const WHITESPACE_PATTERN = /^\s+$/u;

type InlineToken = typeof INLINE_PATTERN.infer;

export function renderHighlight(text: string): string {
	const lines = text.split(LINE_BREAK_PATTERN);
	const rendered = new Array<string>();
	let codeLines: Array<string> | undefined;

	for (const line of lines) {
		codeLines =
			codeLines === undefined ? renderPlainLine(line, rendered) : renderCodeLine(codeLines, line, rendered);
	}

	if (codeLines !== undefined) {
		rendered.push(renderCodeBlock(codeLines));
	}

	return rendered.join("\n");
}

function renderCodeBlock(codeLines: ReadonlyArray<string>): string {
	const array = Array.from<string>({ length: codeLines.length });
	let size = 0;

	for (const line of codeLines) {
		array[size++] = renderFencedLine(line);
	}

	return array.join("\n");
}

function renderInlineToken(token: InlineToken): string {
	if (token.startsWith("**")) return ansi.bold(token.slice(2, -2));
	if (token.startsWith("*")) return ansi.italic(token.slice(1, -1));
	if (token.startsWith("~~")) return ansi.strikethrough(token.slice(2, -2));
	if (token.startsWith("`")) return renderInlineCode(token.slice(1, -1));

	const closingBracket = token.indexOf("](");
	const urlLabel = ` (${token.slice(closingBracket + 2, -1)})`;
	return `${ansi.underline.cyan(token.slice(1, closingBracket))}${ansi.dim(urlLabel)}`;
}

function getWords(parts: ReadonlyArray<string>): Array<string> {
	return parts.filter((part) => part.length > 0 && !WHITESPACE_PATTERN.test(part));
}

function findBinaryIndex(parts: ReadonlyArray<string>): number | undefined {
	const words = getWords(parts);
	if (words.length < 2 || words.includes("--") || !COMMAND_BINARY_PATTERN.test(words[0] ?? "")) return undefined;

	let index = 0;
	for (const part of parts) {
		if (part.length > 0 && !WHITESPACE_PATTERN.test(part)) return index;
		index += 1;
	}

	return undefined;
}

function parseCommandParts(parts: ReadonlyArray<string>): number | undefined {
	const binaryIndex = findBinaryIndex(parts);
	if (binaryIndex === undefined) return undefined;

	if (
		getWords(parts)
			.slice(1)
			.every((word) => !COMMAND_ARG_HINT_PATTERN.test(word))
	) {
		return undefined;
	}

	return binaryIndex;
}

function splitCommandParts(text: string): Array<string> {
	return text.match(COMMAND_TOKEN_PATTERN) ?? [];
}

function renderCommandValue(value: string): string {
	return QUOTED_PATTERN.test(value) ? ansi.green(value) : ansi.cyan(value);
}

function renderCommandFlag(part: string): string {
	const equals = part.indexOf("=");
	if (equals === -1) return ansi.blueBright(part);
	return `${ansi.blueBright(part.slice(0, equals))}${ansi.dim("=")}${renderCommandValue(part.slice(equals + 1))}`;
}

function renderCommandPart(part: string, isBinary: boolean): string {
	if (INLINE_FLAG_PATTERN.test(part)) return renderCommandFlag(part);
	if (isBinary) return ansi.magentaBright(part);
	return renderCommandValue(part);
}

function renderCommandPartsWithFlags(parts: ReadonlyArray<string>, binaryIndex?: number): string {
	const inlineCode = Array.from<string>({ length: parts.length });
	let size = 0;
	let index = 0;
	for (const part of parts) {
		if (part.length === 0 || WHITESPACE_PATTERN.test(part)) {
			inlineCode[size++] = part;
		} else {
			inlineCode[size++] = renderCommandPart(part, index === binaryIndex);
		}

		index += 1;
	}

	return inlineCode.join("");
}

function renderFencedLine(line: string): string {
	if (line.length === 0) return line;
	const parts = splitCommandParts(line);
	const hasFlag = parts.some((part) => part.length > 0 && INLINE_FLAG_PATTERN.test(part));
	if (hasFlag) {
		const binaryIndex = findBinaryIndex(parts);
		if (binaryIndex !== undefined) return renderCommandPartsWithFlags(parts, binaryIndex);
		return ansi.dim(line);
	}

	const command = parseCommandParts(parts);
	if (command !== undefined) return renderCommandPartsWithFlags(parts, command);
	return ansi.dim(line);
}

function renderInlineCode(inner: string): string {
	const parts = splitCommandParts(inner);
	const hasFlag = parts.some((part) => part.length > 0 && INLINE_FLAG_PATTERN.test(part));
	if (!hasFlag) {
		const command = parseCommandParts(parts);
		if (command !== undefined) return renderCommandPartsWithFlags(parts, command);
		return ansi.cyan(inner);
	}

	const binaryIndex = findBinaryIndex(parts);
	return renderCommandPartsWithFlags(parts, binaryIndex);
}

function renderProse(text: string): string {
	return text.replaceAll(PROSE_TOKEN_PATTERN, (match: string, flag?: string, value?: string) => {
		if (flag === undefined) return ansi.yellow(match);
		const suffix = value === undefined ? "" : `${ansi.dim("=")}${ansi.cyan(value.slice(1))}`;
		return `${ansi.blueBright(flag)}${suffix}`;
	});
}

function renderInline(text: string): string {
	const parts = new Array<string>();
	let size = 0;
	let cursor = 0;
	let match = INLINE_PATTERN.exec(text);
	while (match !== null) {
		parts[size++] = renderProse(text.slice(cursor, match.index));
		parts[size++] = renderInlineToken(match.groups.token);
		cursor = match.index + match[0].length;
		match = INLINE_PATTERN.exec(text);
	}

	parts[size] = renderProse(text.slice(cursor));
	return parts.join("");
}

function renderLine(line: string): string {
	if (HORIZONTAL_RULE_PATTERN.test(line)) return ansi.dim(line);

	const heading = HEADING_PATTERN.exec(line);
	if (heading !== null) {
		const { content: headingContent, hashes } = heading.groups;
		const content = renderInline(headingContent);
		const prefix = ansi.dim("#".repeat(hashes.length));
		return hashes.length === 1
			? `${prefix} ${ansi.bold(ansi.underline(content))}`
			: `${prefix} ${ansi.bold(content)}`;
	}

	const quote = QUOTE_PATTERN.exec(line);
	if (quote !== null) return `${ansi.dim(">")} ${renderInline(quote.groups.content)}`;

	const bullet = BULLET_PATTERN.exec(line);
	if (bullet !== null) {
		const { content, marker } = bullet.groups;
		return `${ansi.dim(marker)} ${renderInline(content)}`;
	}

	const ordered = ORDERED_PATTERN.exec(line);
	if (ordered !== null) {
		const { content, marker } = ordered.groups;
		return `${ansi.dim(marker)} ${renderInline(content)}`;
	}

	return renderBareCommand(line) ?? renderInline(line);
}

function findKnownCommandIndex(parts: ReadonlyArray<string>): number | undefined {
	const binaryIndex = findBinaryIndex(parts);
	return binaryIndex !== undefined && KNOWN_COMMANDS.has(parts[binaryIndex] ?? "") ? binaryIndex : undefined;
}

function renderBareCommand(line: string): string | undefined {
	if (!BARE_COMMAND_PATTERN.test(line)) return undefined;

	const parts = splitCommandParts(line);
	const hasFlag = parts.some((part) => part.length > 0 && INLINE_FLAG_PATTERN.test(part));
	const binaryIndex = hasFlag ? findBinaryIndex(parts) : (parseCommandParts(parts) ?? findKnownCommandIndex(parts));
	return binaryIndex === undefined ? undefined : renderCommandPartsWithFlags(parts, binaryIndex);
}

function renderPlainLine(line: string, rendered: Array<string>): Array<string> | undefined {
	const opening = FENCE_PATTERN.exec(line);
	if (opening === null) {
		rendered.push(renderLine(line));
		return undefined;
	}

	const { marker } = opening.groups;
	const rest = line.slice(opening[0].length);
	const closingIndex = rest.indexOf(marker);
	if (closingIndex === -1) {
		return [];
	}

	rendered.push(renderCodeBlock([rest.slice(0, closingIndex)]));

	const remainder = rest.slice(closingIndex + marker.length);
	if (remainder.length > 0) {
		rendered.push(renderLine(remainder));
	}

	return undefined;
}

function renderCodeLine(codeLines: Array<string>, line: string, rendered: Array<string>): Array<string> | undefined {
	const closing = FENCE_PATTERN.exec(line);
	if (closing === null) {
		codeLines.push(line);
		return codeLines;
	}

	const { marker } = closing.groups;
	const closingFenceIndex = line.indexOf(marker);
	codeLines.push(line.slice(0, closingFenceIndex));
	rendered.push(renderCodeBlock(codeLines));

	const remainder = line.slice(closingFenceIndex + marker.length);
	if (remainder.length > 0) {
		rendered.push(renderLine(remainder));
	}

	return undefined;
}

const isDescriptionObject = type({
	"+": "ignore",
	"description?": isMaybeString,
});

/**
 * Highlights `text` at build time, so the renderer collapses to a string
 * literal instead of riding along in every bundle that only needs a
 * description.
 *
 * Called with no argument it takes the `description` of the nearest
 * `package.json`, resolved from the calling file at build time. The `argv[1]`
 * fallback matters because a CLI is also run straight from source
 * (`bun ts-build.ts`), where there is no macro context at all; without it that
 * would throw during import and take the process down with it. Scripts at the
 * repository root have no manifest of their own, so they pass their text.
 *
 * @param text - The text to highlight, or `undefined` to use the nearest manifest description.
 * @returns The pre-highlighted text.
 */
// eslint-disable-next-line ts/no-shadow -- not a shadowing.
export const highlight = defineMacro(function highlight(this: MacroContext | undefined, text?: string): string {
	return renderHighlight(text ?? readNearestDescription(this?.id ?? argv[1] ?? import.meta.filename));
});

function readNearestDescription(from: string): string {
	let directory = nodePath.dirname(nodePath.resolve(from));
	for (;;) {
		const manifest = nodePath.join(directory, "package.json");
		if (existsSync(manifest)) {
			const result = isDescriptionObject(JSON.parse(readFileSync(manifest, "utf8")));
			if (result instanceof type.errors) {
				throw new TypeError(
					`${manifest} has no usable "description"; pass the text to cliffyHighlight() explicitly. Got error: ${result.summary}`,
				);
			}

			const { description } = result;
			if (description === undefined) {
				throw new Error(`${manifest} has no "description"; pass the text to cliffyHighlight() explicitly.`);
			}

			return description;
		}

		const parent = nodePath.dirname(directory);
		if (parent === directory) {
			throw new Error(`No package.json above ${from}; pass the text to cliffyHighlight() explicitly.`);
		}

		directory = parent;
	}
}
