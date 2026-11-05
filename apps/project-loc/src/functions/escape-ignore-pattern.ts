import { GLOB_CHARACTERS_REGEXP } from "$constants/regexp-constants";

const AMPERSAND_ESCAPE = String.raw`\$&`;

export function escapeIgnorePattern(path: string): string {
	// eslint-disable-next-line unicorn/no-unsafe-string-replacement -- constant.
	return path.replaceAll(GLOB_CHARACTERS_REGEXP, AMPERSAND_ESCAPE);
}
