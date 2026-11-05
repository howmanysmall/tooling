const BASE_SENSITIVITY: Intl.CollatorOptions = { sensitivity: "base" };
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
