import { DIGITS_REGEXP, WHITESPACE_REGEXP } from "$constants/regexp-constants";

export function parseSccVersion(output: string): string | undefined {
	for (const token of output.split(WHITESPACE_REGEXP)) {
		const parts = token.split(".");
		if (parts.length === 3 && parts.every((part) => DIGITS_REGEXP.test(part))) return token;
	}

	return undefined;
}
