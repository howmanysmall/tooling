# @howmanysmall/linter-utilities

Finds and checks linter and formatter settings for reuse by lint configs. This includes the repo's
`.oxfmtrc.json` file.

| Export | What it provides |
| --- | --- |
| `./configuration` | `getOxfmtConfigurationAsync()` and the `isOxfmtConfiguration` validator. |

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/linter-utilities`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
