/**
 * Code is ink on paper, like the rest of the notebook: color means data, and
 * syntax is not data. Tones come from the ink scale in `styles/tokens.css`,
 * so keep the two in step.
 */

/** The ink tones one theme uses. */
interface InkTones {
	readonly ink: string;
	readonly ink2: string;
	readonly ink3: string;
	readonly well: string;
}

/** One TextMate token rule. */
interface TokenColor {
	readonly scope: Array<string>;
	readonly settings: { readonly fontStyle?: string; readonly foreground: string };
}

/** A TextMate theme, as Expressive Code reads it. */
export interface SyntaxTheme {
	readonly name: string;
	readonly colors: Readonly<Record<string, string>>;
	readonly tokenColors: Array<TokenColor>;
	readonly type: "dark" | "light";
}

/**
 * Builds a monochrome theme from the ink tones.
 *
 * @param name - What Expressive Code calls the theme.
 * @param type - The ground it is drawn on, light or dark.
 * @param tones - The well and the three inks drawn on that ground.
 * @returns A theme that draws code in those inks alone.
 */
function createSyntaxTheme(name: string, type: "dark" | "light", tones: InkTones): SyntaxTheme {
	return {
		name,
		colors: { "editor.background": tones.well, "editor.foreground": tones.ink },
		tokenColors: [
			{
				scope: ["comment", "punctuation.definition.comment"],
				settings: { fontStyle: "italic", foreground: tones.ink3 },
			},
			{ scope: ["string", "constant.other.symbol"], settings: { foreground: tones.ink2 } },
			{ scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: tones.ink3 } },
			{
				scope: ["keyword", "storage", "entity.name.function", "support.function", "constant", "variable"],
				settings: { foreground: tones.ink },
			},
		],
		type,
	};
}

/** The light ground's syntax theme. */
export const lightSyntaxTheme = createSyntaxTheme("notebook-light", "light", {
	ink: "#1a1c20",
	ink2: "#555a63",
	ink3: "#6b7079",
	well: "#ffffff",
});

/** The dark ground's syntax theme. */
export const darkSyntaxTheme = createSyntaxTheme("notebook-dark", "dark", {
	ink: "#eeeeec",
	ink2: "#a9adb4",
	ink3: "#8c9199",
	well: "#171a1d",
});
