import {
	cliConfiguration,
	configurableCliConfiguration,
	createBinConfiguration,
} from "@howmanysmall/project-configurations/tsdown/cli";
import { defineConfig, mergeConfig } from "tsdown";

// The private workspace packages aren't published, so they are inlined.
const deps = { alwaysBundle: [/^@howmanysmall\//u] };

// Only `index` is imported by configuration files, so only it gets
// declarations. `clean` runs once, before both builds write to `dist`.
const configuration = defineConfig([
	mergeConfig(configurableCliConfiguration, {
		deps,
		entry: { index: "./src/index.ts" },
		outDir: "dist",
		tsconfig: "tsconfig.lib.json",
	}),
	mergeConfig(cliConfiguration, {
		...createBinConfiguration("footnote", import.meta.dirname),
		// Bundling the UMD `main` leaves its relative `require` calls unresolved.
		alias: { "jsonc-parser": "jsonc-parser/lib/esm/main.js" },
		clean: false,
		deps,
		outDir: "dist",
		tsconfig: "tsconfig.lib.json",
	}),
]);

export default configuration;
