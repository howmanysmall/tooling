# darkroom documentation

The documentation site for [darkroom](../../apps/darkroom/), built with Astro and Starlight in the
[documentation theme](../../tools/documentation-theme/). It publishes to
<https://docs.howmanysmall.com/tooling/darkroom/>.

| Path | What lives there |
| --- | --- |
| `src/content/docs/` | The pages, in MDX. The sidebar order is in `astro.config.ts`. |
| `src/components/` | The home page and the model gallery, which reads `apps/darkroom/examples/`. |
| `src/styles/palette.css` | The site's colors, named after darkroom toners. Selenium marks focus, and cyanotype and sepia mark stdout and stderr. |

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/darkroom-documentation`.

| Script | What it does |
| --- | --- |
| `dev` | Serves the site with live reload. |
| `build` | Builds the site into `dist/`. |
| `preview` | Serves the built site. |
| `type-check` | Checks the Astro files with `astro check`. |

To publish, run `node --run documentation -- publish` from the repository root. A release of darkroom publishes it
too.
