# @pobammer-ts/colorful

A color-focused CLI.

## Usage

```sh
colorful --help
```

`colorful` runs on Node and `colorful-bun` runs on Bun. Both share one
bundle, and the code only uses Node APIs.

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@pobammer-ts/colorful`.

| Script | What it does |
| --- | --- |
| `build` | Bundles `src/` into `dist/` with tsdown. |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsc --build`. |

## Release

From the repository root:

```sh
node --run release -- colorful [patch|minor|major|<version>]
```
