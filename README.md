# darkroom

Command-line tools by howmanysmall, in one pnpm monorepo.

## Layout

| Directory | What lives there |
| --- | --- |
| `apps/<tool>/` | One published CLI per directory, such as `apps/darkroom/`. Each has its own version, changelog, and npm package. |
| `packages/` | Private libraries the tools share. They are bundled into each tool at build time. |
| `tools/` | Lint, test, and build configuration shared by every workspace project. |
| `scripts/` | Repository scripts: releasing and tsconfig reference syncing. |
| `turbo/generators/` | Templates for new tools and libraries. |

The tools run on Bun or Node. Code only uses Node APIs, never `Bun.*`, and pnpm manages
dependencies.

## Add a tool

```sh
pnpm turbo gen cli
pnpm install
```

The generator asks for a name, a description, an npm scope, and whether the binary runs on Bun or
Node. It creates `apps/<name>/` with its scripts, a first test, and a README, and syncs the tsconfig
references. Use `pnpm turbo gen package` for a shared library in `packages/`.

## Release a tool

```sh
node --run release -- <tool> [patch|minor|major|<version>]
```

The release script runs bumpp inside `apps/<tool>/`. It builds the tool, creates
`apps/<tool>/CHANGELOG.md` on the first release, commits `chore(release): <tool>@<version>`, tags
`<tool>@<version>`, and pushes. Leave out the release type to pick one from a prompt, and pass
`--yes` to skip the confirmation.

The tag starts `.github/workflows/release.yaml`. It checks that the tag matches the tool's
`package.json`, waits for CI, writes the release notes with communique, falls back to git-cliff,
commits the changelog to `main`, publishes the package to npm with provenance, and creates the
GitHub release.

## Tasks

Every workspace package has `lint` and `type-check`, plus `test` when it has tests and `build` when
it ships a binary. `lint`, `test`, and `type-check` each have an `:agent` variant. Turbo runs them
per package and caches the results, so a package that did not change is not checked again.

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
