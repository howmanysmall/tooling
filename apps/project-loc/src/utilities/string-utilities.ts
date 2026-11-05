import getStringWidth from "fast-string-width";

import { graphemes } from "$constants/class-constants";

const BASE_SENSITIVITY: Intl.CollatorOptions = { sensitivity: "base" };
const ELLIPSIS = "…";
const ELLIPSIS_WIDTH = getStringWidth(ELLIPSIS);
const UPPERCASE_ASCII_REGEXP = /[A-Z]/gu;

export function compareWithLocale(left: string, right: string): number {
	return left.localeCompare(right, undefined, BASE_SENSITIVITY);
}

export function toLowercase(value: string): string {
	return value.toLowerCase();
}

export function toAsciiLowerCase(value: string): string {
	// eslint-disable-next-line unicorn/no-unsafe-string-replacement -- this isn't one.
	return value.replaceAll(UPPERCASE_ASCII_REGEXP, toLowercase);
}

export function groupDigits(value: number): string {
	return value.toLocaleString("en-US");
}

export function shorten(text: string, maximum: number): string {
	if (getStringWidth(text) <= maximum) return text;

	let result = "";
	for (const { segment } of graphemes.segment(text)) {
		if (getStringWidth(result + segment) > maximum - ELLIPSIS_WIDTH) break;
		result += segment;
	}

	return result + ELLIPSIS;
}

export function padEnd(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - getStringWidth(text)));
}

export function padStart(text: string, width: number): string {
	return " ".repeat(Math.max(0, width - getStringWidth(text))) + text;
}

export function getWidestWidth(header: string, cells: ReadonlyArray<string>): number {
	let width = getStringWidth(header);
	for (const cell of cells) {
		width = Math.max(width, getStringWidth(cell));
	}

	return width;
}
