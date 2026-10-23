# @pobammer-ts/noncommittal

A generator for Git commit messages that uses large language models.

## Usage

```sh
noncommittal --help
```

`noncommittal` runs on Node and `noncommittal-bun` runs on Bun. Both share one
bundle, and the code only uses Node APIs.

## Configuration

[c12](https://github.com/unjs/c12) loads `noncommittal.config.{ts,mts,js,mjs,json,...}` or
`.noncommittalrc` from the working directory. `--config <file>` loads that file instead, and
fails if it does not exist. Invalid settings exit with code 3.

Configuration files import `defineConfiguration` for types:

```ts
// noncommittal.config.ts
import { defineConfiguration } from "@pobammer-ts/noncommittal";

export default defineConfiguration({
	verbose: true,
});
```

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@pobammer-ts/noncommittal`.

| Script | What it does |
| --- | --- |
| `build` | Bundles `src/` into `dist/` with tsdown. |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |

## Release

From the repository root:

```sh
node --run release -- noncommittal [patch|minor|major|<version>]
```
