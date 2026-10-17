import { darkSyntaxTheme, lightSyntaxTheme } from "./syntax-themes";

import type { StarlightPlugin } from "@astrojs/starlight/types";

const PACKAGE = "@howmanysmall/documentation-theme";
const RULE = "var(--rule)";
const WELL = "var(--well)";

/** How a site uses the theme. */
export interface DocumentationThemeOptions {
	/**
	 * The site's palette: a stylesheet that sets `--focus`, the `--data-N`
	 * colors, and the two `--riso-*` inks, in light and dark. It is the only
	 * color a site chooses; everything else comes from the theme.
	 */
	readonly palette: string;
}

/**
 * Dresses a Starlight site in Anna's field-notebook design: paper, ink, and
 * hairline rules, with color only for data and focus.
 *
 * @param options - How the site uses the theme.
 * @param options.palette - The site's palette stylesheet.
 * @returns The Starlight plugin.
 */
export function createDocumentationTheme({ palette }: DocumentationThemeOptions): StarlightPlugin {
	return {
		name: PACKAGE,
		hooks: {
			"config:setup"({ config, updateConfig }): void {
				updateConfig({
					components: {
						Footer: `${PACKAGE}/overrides/footer.astro`,
						Header: `${PACKAGE}/overrides/header.astro`,
						...config.components,
					},
					customCss: [
						`${PACKAGE}/styles/fonts.css`,
						`${PACKAGE}/styles/tokens.css`,
						palette,
						`${PACKAGE}/styles/starlight.css`,
						`${PACKAGE}/styles/notebook.css`,
						...(config.customCss ?? []),
					],
					expressiveCode: {
						styleOverrides: {
							borderColor: RULE,
							borderRadius: "0",
							borderWidth: "1px",
							codeBackground: WELL,
							codeFontFamily: "var(--font-mono)",
							codeFontSize: "0.8125rem",
							frames: {
								editorActiveTabIndicatorTopColor: "var(--rule)",
								frameBoxShadowCssValue: "none",
								inlineButtonBorder: RULE,
								terminalBackground: WELL,
								terminalTitlebarBackground: WELL,
								terminalTitlebarBorderBottomColor: RULE,
								terminalTitlebarDotsOpacity: "0",
							},
							uiFontFamily: "var(--font-sans)",
						},
						themes: [darkSyntaxTheme, lightSyntaxTheme],
					},
				});
			},
		},
	};
}
