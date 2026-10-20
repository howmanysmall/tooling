# @howmanysmall/lint-configurations

The oxlint and ESLint configuration for the whole repository. The root `oxlint.config.ts` and
`eslint.config.ts` call `getOxlintAsync` and `getEslintAsync` from here, so rule changes belong in
this package.

| Export | What it provides |
| --- | --- |
| `./get-oxlint-async` | `getOxlintAsync()`, the oxlint configuration. |
| `./get-eslint-async` | `getEslintAsync()`, the ESLint flat configuration. |

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/lint-configurations`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
