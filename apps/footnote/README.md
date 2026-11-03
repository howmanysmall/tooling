# @pobammer-ts/footnote

Keeps `tsconfig.json` `references` in a pnpm workspace in line with its
`workspace:` dependencies. Each project references the projects it depends on,
and the root `tsconfig.json`, if there is one, references every project.

It only works with pnpm: the workspace root is the nearest `pnpm-workspace.yaml`
above the working directory, and projects come from its `packages` globs. A
project is a matched directory with both a `package.json` and a `tsconfig.json`.

## Usage

```sh
footnote [--check] [-c, --config <file>]
```

`footnote` updates the stale files. `--check` reports them and writes nothing.
Either way, stdout gets one block per stale file, and stderr gets the summary:

```text
tsconfig.json
  + ./apps/footnote
  - ./packages/gone
```

Only a reference that has to be added or removed makes a file stale, not the
order. A changed file gets its references sorted by path.

Footnote removes a reference only if it targets a project, or a path a workspace
glob covers that is not ignored and is not a project, such as a deleted package.
It leaves everything else alone, so `./tsconfig.node.json`, a reference into an
ignored project, and a hand-written `../../some/path` all stay as written.

`footnote` runs on Node and `footnote-bun` runs on Bun. Both share one
bundle, and the code only uses Node APIs.

| Exit code | Meaning |
| --- | --- |
| 0 | Everything is in sync, or was just synced. |
| 1 | `--check` found stale files, there is no workspace, a file is malformed, or `initialize` found an existing configuration. |
| 2 | The command line is invalid. |
| 3 | The configuration could not be loaded or is invalid. |

## Initialize

```sh
footnote initialize [-f, --force] [-n, --dry-run]
```

`footnote init` is the same command. It writes `.config/footnote.json` in the
workspace root, with `ignore` listing every project whose tsconfig lacks
`compilerOptions.composite: true`, because `tsc --build` rejects a reference to
such a project. It only writes that file, so run `footnote` afterward to sync.
On success, stdout gets the written path and stderr gets everything else.

It fails if a configuration already exists, including with `--dry-run`.

| Flag | What it does |
| --- | --- |
| `-f, --force` | Writes the file even if a configuration exists. Footnote warns about any other configuration file, which it leaves in place and which may still be loaded. |
| `-n, --dry-run` | Prints the JSON on stdout and writes nothing. |

It reads only each project's own tsconfig and does not follow `extends`, so a
project that inherits `composite` gets listed. Remove it from `ignore` by hand.

## Configuration

[c12](https://github.com/unjs/c12) loads `footnote.config.{ts,mts,js,mjs,json,...}`,
`.config/footnote.{ts,json,...}`, or `.footnoterc` from the workspace root.
`--config <file>` loads that file instead, relative to the working directory, and
fails if it does not exist.

`ignore` lists workspace-relative globs for projects footnote leaves alone:

```json
{
	"ignore": ["documentation/*"]
}
```

Configuration files written in TypeScript import `defineConfiguration` for types:

```ts
// footnote.config.ts
import { defineConfiguration } from "@pobammer-ts/footnote";

export default defineConfiguration({
	ignore: ["documentation/*"],
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
