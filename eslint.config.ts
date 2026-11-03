import { fileURLToPath } from "node:url";
import { getEslintAsync } from "@howmanysmall/lint-configurations/get-eslint-async";

import type { LintConfiguration } from "@howmanysmall/lint-configurations/get-eslint-async";

const tsconfigPath = fileURLToPath(new URL("tsconfig.json", import.meta.url));

// eslint-disable-next-line flawless/no-redundant-type-annotation -- the inferred type is not portable (TS2883).
const configuration: LintConfiguration = await getEslintAsync(tsconfigPath);

export default configuration;
