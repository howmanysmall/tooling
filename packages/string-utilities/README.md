# @howmanysmall/string-utilities

Helpers for string case, transliteration, and redaction.

Private. Tools consume the TypeScript source through `workspace:*`, and tsdown bundles it into each
tool's build.

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/string-utilities`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
