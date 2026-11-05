import { FALLBACK_PALETTE, GRAY, LANGUAGE_COLORS } from "$constants/rendering-constants";

export function getLanguageColor(name: string): string {
	const known = LANGUAGE_COLORS.get(name);
	if (known !== undefined) return known;

	const first = name.codePointAt(0) ?? 0;
	/* v8 ignore next -- @preserve */
	return FALLBACK_PALETTE[(first + name.length) % FALLBACK_PALETTE.length] ?? GRAY;
}
