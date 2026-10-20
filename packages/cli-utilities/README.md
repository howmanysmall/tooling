# @howmanysmall/cli-utilities

Helpers for building Cliffy command-line tools.

| Export | What it provides |
| --- | --- |
| `./create-base-command` | `createBaseCommand(name, version, description, options?)`, a Cliffy command with colored help. Errors go to stderr as one line. A validation error prints `error: <message>` and a `--help` pointer, then exits with its code. A `CliError` exits with its own code, and anything else exits 1. Setting `DEBUG` adds stack traces. `handleCommandError` is the same handler, exported for testing. |
| `./cli-error` | `CliError(message, exitCode)`, the base class for expected failures with a specific exit code. |
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
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
