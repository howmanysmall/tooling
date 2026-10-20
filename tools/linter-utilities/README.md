# @howmanysmall/linter-utilities

Finds and validates linter and formatter configuration, such as the repository's `.oxfmtrc.json`, for
the lint configurations to reuse.

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
