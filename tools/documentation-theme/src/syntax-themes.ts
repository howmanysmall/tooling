/**
 * Code is ink on paper, like the rest of the notebook: color means data, and
 * syntax is not data. Tones come from the ink scale in `styles/tokens.css`,
 * so keep the two in step, with one exception. Shell blocks read like a
 * terminal: flags print gold and values print pink, so a command line scans
 * by what changes between examples. Neither hue reuses the focus, data, or
 * riso inks; both clear 4.5:1 against each well. The hues are theme-wide
 * defaults, paired with each site's palette: darkroom records its values in
 * its palette.css, beside its Figma variables. A second site with clashing
 * data inks gets its own pair, not these hexes.
 */

/** The ink tones one theme uses, plus the two hues reserved for shells. */
interface InkTones {
	readonly flag: string;
	readonly ink: string;
	readonly ink2: string;
	readonly ink3: string;
	readonly value: string;
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
		// Terminal blocks are a language with fixed roles. Each role names
		// its scopes, so a flat block means the grammar stopped emitting a
		// scope, not a missing rule:
		// program .. entity.name.command.shell .... bold ink, the anchor
		// flags .... constant.other.option ........ gold, what varies
		// values ... shell strings and numbers .... pink, the payload
		// glue ..... keyword.operator, punct ...... faint ink, pipes
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
			{
				scope: ["entity.name.command.shell", "support.function.command.fish"],
				settings: { fontStyle: "bold", foreground: tones.ink },
			},
			{ scope: ["constant.other.option"], settings: { foreground: tones.flag } },
			{ scope: ["constant.numeric"], settings: { foreground: tones.ink2 } },
			{
				scope: [
					"constant.numeric.integer.shell",
					"string.quoted.double.shell",
					"string.quoted.single.shell",
					"string.unquoted.argument.shell",
					"string.unquoted.shell",
				],
				settings: { foreground: tones.value },
			},
		],
		type,
	};
}

/** The light ground's syntax theme. */
export const lightSyntaxTheme = createSyntaxTheme("notebook-light", "light", {
	flag: "#7a5c00",
	ink: "#1a1c20",
	ink2: "#555a63",
	ink3: "#6b7079",
	value: "#a61e69",
	well: "#ffffff",
});

/** The dark ground's syntax theme. */
export const darkSyntaxTheme = createSyntaxTheme("notebook-dark", "dark", {
	flag: "#e5c07b",
	ink: "#eeeeec",
	ink2: "#a9adb4",
	ink3: "#8c9199",
	value: "#f06595",
	well: "#171a1d",
});
