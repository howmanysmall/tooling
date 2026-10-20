# @howmanysmall/project-configurations

Shared tsdown and Vitest configuration for every workspace package.

| Export | What it provides |
| --- | --- |
| `./tsdown` | `sharedConfiguration`, merged into each tool's `tsdown.config.ts`. |
| `./vitest` | `sharedConfiguration` and `createPackageConfiguration(name)` for each package's `vitest.config.ts`. |
| `./vitest/stryker` | The flat Vitest configuration Stryker uses to mutate the tools in `apps/`. |
| `./vitest/vitiate` | The Vitest configuration for vitiate fuzz targets. |

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/project-configurations`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `type-check` | Type-checks this package and its references with `tsrs --build`. |
