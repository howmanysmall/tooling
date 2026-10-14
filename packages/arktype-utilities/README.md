# @howmanysmall/arktype-utilities

Shared arktype validators for primitives, JSON, and string dictionaries, such as `isString`,
`isNonEmptyString`, `isJsonObject`, and the `isMaybe*` and `isNullable*` variants.

Private. Tools consume the TypeScript source through `workspace:*`, and tsdown bundles it into each
tool's build.

```ts
import { isNonEmptyString } from "@howmanysmall/arktype-utilities";
```

## Scripts

Run these from this directory, or from the repository root with
`node --run turbo -- run <script> --filter=@howmanysmall/arktype-utilities`.

| Script | What it does |
| --- | --- |
| `lint` | Lints this package with the repository's oxlint, ESLint, and Biome configuration. |
| `test` | Runs the Vitest suite. |
| `type-check` | Type-checks this package and its references with `tsc --build`. |
