# `tooling`

Command-line tools by howmanysmall, in one pnpm monorepo.

## Layout

| Directory | What lives there |
| --- | --- |
| `apps/<tool>/` | One published command-line tool per directory, such as `apps/darkroom/`. Each has its own version, changelog, and npm package. |
| `documentation/<tool>/` | The tool's documentation site, built with Astro and Starlight. |
| `packages/` | Private libraries the tools share. They're bundled into each tool at build time. |
| `tools/` | Lint, test, and build configuration shared by every workspace project, and the documentation theme. |
| `scripts/` | Repository scripts: releasing, publishing the documentation, and `tsconfig` reference syncing. |
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
The new `apps/<name>/` gets its scripts, a first test, and a README. The generator also updates its `tsconfig`
references. Use `pnpm turbo gen package` for a shared library in `packages/`.

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
7. Publishes the documentation sites from the tag.

## Documentation

Each site in `documentation/` uses `@howmanysmall/documentation-theme` from `tools/`. The theme has the layout, the
type, and the components. Each site adds its pages and a palette file with its colors.

The sites publish together, each under its own path on docs.howmanysmall.com. A repository gets one GitHub Pages
deployment, and every site goes out in it.

```sh
node --run documentation:dev                     # every site, with live reload
node --run documentation -- list                 # the sites and their addresses
node --run documentation -- publish              # pick a ref, confirm, and follow the deploy
node --run documentation -- publish --ref main --yes
```

`publish` runs `.github/workflows/documentation.yaml` on GitHub. It asks which branch or tag to build and confirms
before the deploy starts. The first time, it also offers to turn on GitHub Pages. `--dry-run` shows what it would
publish.

## Tasks

Every workspace package has `lint:oxlint` and `type-check`, plus `test` when it has tests and
`build` when it produces a binary. Each has an `:agent` variant. Turbo runs them per package and
caches the results, so only changed packages run again.

The turbo `lint` task runs `lint:oxlint` in every package, `//#lint:oxlint` for root configuration
files, and `//#lint:eslint` once over the whole repository. Oxlint and Biome can't cache, so turbo
caches them per package. ESLint writes `.eslintcache` files, and one type-aware ESLint process per
package would each load the full TypeScript program.

```sh
node --run turbo -- run test --filter=@pobammer-ts/darkroom   # one package
node --run lint                                               # oxlint per package, ESLint at root
node --run lint:affected                                      # packages changed since main
node --run lint:eslint                                        # ESLint only
node --run lint:package -- apps/darkroom                      # oxlint and Biome on any path
```

The root scripts cover the whole repository, including root configuration and scripts:

```sh
node --run lint
node --run type-check
node --run test
node --run build
```

`mise run check` runs all four.
