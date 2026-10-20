# @howmanysmall/documentation-theme

Anna's field-notebook design for the Starlight documentation sites in `documentation/`. Pages are paper, ink, and
hairline rules. Newsreader sets the headings and IBM Plex the rest. Only data and links get a hue, plus one riso
overprint on the number a page is about.

Figma has the design, on the `T - darkroom docs` page of the
[anna-design file](https://www.figma.com/design/B4T0nYhSFRwiGvL9sh2BCD?node-id=130-2). Its `darkroom docs` variables
match the CSS here for both themes.

## Use it in a site

```ts title="astro.config.ts"
import starlight from "@astrojs/starlight";
import { createDocumentationTheme } from "@howmanysmall/documentation-theme";
import { getDocumentationSite } from "@howmanysmall/documentation-theme/site";
import { defineConfig } from "astro/config";

const { base, site } = getDocumentationSite("darkroom");

export default defineConfig({
	base,
	integrations: [
		starlight({
			plugins: [createDocumentationTheme({ palette: "./src/styles/palette.css" })],
			title: "darkroom",
		}),
	],
	site,
});
```

## Change the design

| To change | Edit |
| --- | --- |
| One site's colors | That site's `src/styles/palette.css`. It sets `--focus`, `--data-1` and up, and `--riso-a` and `--riso-b`. |
| Paper, ink, type sizes, and column widths | `src/styles/tokens.css`. Every site follows. |
| How Starlight's parts look: sidebar, tables, code | `src/styles/starlight.css`. |
| Section rows, readouts, legends, and the footnote band | `src/styles/notebook.css`, with the components in `src/components/`. |
| The fonts | `src/styles/fonts.css`. |
| The header and footer | `src/overrides/`. |
| Syntax colors | `src/syntax-themes.ts`, which follows the ink scale in `tokens.css`, plus gold flags and pink values in shells. |
| The address the sites publish to | `src/site.ts`. |

A palette change belongs in both places. Update the matching Figma variable along with the CSS.

## Components

Import them in MDX or Astro from `@howmanysmall/documentation-theme/components/<name>.astro`.

| Component | What it draws |
| --- | --- |
| `notebook.astro` | Wraps notebook rows so they lay out by the width they have. Add `notebook-home` inside it to make it the home page. |
| `notebook-row.astro` | A section row, with the margin note at the left, the figure in the middle, and the `readouts` slot at the right. |
| `readout.astro` | A label over a value. `overprint` prints the value with the riso halo. Use it once per page. |
| `overprint.astro` | The overprinted numeral on its own. |
| `legend.astro` | An inline legend, one entry per data series, each with its own line style. |
| `transcript.astro` | A terminal session, with each printed line marked by its series. |
| `link-rows.astro` | Rows of links to other pages. |
| `footnote-band.astro` | The band at the foot of a page, with a label in the margin column. |

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/documentation-theme`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
