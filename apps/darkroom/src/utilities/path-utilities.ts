import { EDGE_UNDERSCORES, NON_SLUG_REGEXP, REPEATED_UNDERSCORES } from "$constants";

export function makeStringSafeForPath(value: string): string {
	return value
		.normalize("NFKD")
		.replaceAll(/\p{M}/gu, "")
		.replaceAll(NON_SLUG_REGEXP, "_")
		.replaceAll(REPEATED_UNDERSCORES, "_")
		.replaceAll(EDGE_UNDERSCORES, "");
}
