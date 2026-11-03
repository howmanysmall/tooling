# @pobammer-ts/footnote

Syncs &#x60;tsconfig.json&#x60; &#x60;references&#x60; for all workspace projects.

## Usage

```sh
footnote --help
```

`footnote` runs on Node and `footnote-bun` runs on Bun. Both share one
bundle, and the code only uses Node APIs.

## Configuration

[c12](https://github.com/unjs/c12) loads `footnote.config.{ts,mts,js,mjs,json,...}` or
`.footnoterc` from the working directory. `--config <file>` loads that file instead, and
fails if it does not exist. Invalid settings exit with code 3.

Configuration files import `defineConfiguration` for types:

```ts
// footnote.config.ts
import { defineConfiguration } from "@pobammer-ts/footnote";

export default defineConfiguration({
	verbose: true,
});
```

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@pobammer-ts/footnote`.

| Script | What it does |
| --- | --- |
| `build` | Bundles `src/` into `dist/` with tsdown. |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |

## Release

From the repository root:

```sh
node --run release -- footnote [patch|minor|major|<version>]
```
