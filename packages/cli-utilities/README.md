# @howmanysmall/cli-utilities

Helpers for building Cliffy command-line tools.

| Export | What it provides |
| --- | --- |
| `./create-base-command` | `createBaseCommand(name, version, description, options?)`, a Cliffy command with colored help that prints help and exits on validation errors. |
| `./get-script-name` | `getScriptName()`, the binary name. Inlined at build time when imported `with { type: "macro" }`, and read from `argv` otherwise. |
| `./cliffy-highlight` | `renderHighlight(text)`, which renders Markdown-style emphasis, code, and links for the terminal, and the `highlightDescription` macro. |

Private. Tools consume the TypeScript source through `workspace:*`, and tsdown bundles it into each
tool's build.

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/cli-utilities`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsc --build`. |
