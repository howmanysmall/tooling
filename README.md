# darkroom

Command-line tools by howmanysmall, in one pnpm monorepo.

## Layout

| Directory | What lives there |
| --- | --- |
| `apps/<tool>/` | One published command-line tool per directory, such as `apps/darkroom/`. Each has its own version, changelog, and npm package. |
| `packages/` | Private libraries the tools share. They're bundled into each tool at build time. |
| `tools/` | Lint, test, and build configuration shared by every workspace project. |
| `scripts/` | Repository scripts: releasing and `tsconfig` reference syncing. |
| `turbo/generators/` | Templates for new tools and libraries. |

The tools run on Bun or Node. Code uses Node APIs only, so it behaves the same on both, and pnpm
manages dependencies.

## Add a tool

| Generator | For | Output |
| --- | --- | --- |
| `pnpm turbo gen cli` | A tool that only runs, like darkroom. | Minified `dist/cli.js`, published through `bin`. |
| `pnpm turbo gen configurable-cli` | A tool with configuration files that import `defineConfiguration` from it. | `dist/cli.js` plus `dist/index.js` and `dist/index.d.ts` for configuration files. |

```sh
pnpm turbo gen cli
pnpm install
```

Both generators prompt for a name, a description, an npm scope, and a runtime (`bun` or `node`).
The new `apps/<name>/` gets its scripts, a first test, and a README, and its tsconfig references
are synced. Use `pnpm turbo gen package` for a shared library in `packages/`.

## Release a tool

```sh
node --run release -- <tool> [patch|minor|major|<version>]
```

The release script runs bumpp inside `apps/<tool>/`. It builds the tool, creates
`apps/<tool>/CHANGELOG.md` on the first release, commits `chore(release): <tool>@<version>`, tags
`<tool>@<version>`, and pushes. Leave out the release type to pick one from a prompt, and pass
`--yes` to skip the confirmation.

The tag starts `.github/workflows/release.yaml`, which:

1. Checks that the tag matches the tool's `package.json`.
2. Waits for CI to pass.
3. Writes the release notes with communique, or with git-cliff when communique fails.
4. Commits the changelog to `main`.
5. Publishes the package to npm with provenance.
6. Creates the GitHub release.

## Tasks

Every workspace package has `lint` and `type-check`, plus `test` when it has tests and `build` when
it produces a binary. `lint`, `test`, and `type-check` each have an `:agent` variant. Turbo runs them
per package and caches the results, so only changed packages run again.

```sh
node --run turbo -- run test --filter=@pobammer-ts/darkroom   # one package
node --run turbo -- run lint                                  # every package
node --run lint:affected                                      # packages changed since main
```

The root scripts cover the whole repository in one pass, including root configuration and scripts:

```sh
node --run lint
node --run type-check
node --run test
node --run build
```

`mise run check` runs all four.
