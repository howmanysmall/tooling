import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { defineConfig, mergeConfig } from "tsdown";

const darkroomConfiguration = mergeConfig(cliConfiguration, {
	// The private workspace packages aren't published, so they are inlined.
	// `temporal-polyfill` is a dev-only fallback for runtimes without native
	// `Temporal` (Node <26, older Bun) — inlining keeps old runtimes working
	// without shipping it as a runtime dependency.
	deps: { alwaysBundle: [/^@howmanysmall\//u, /^temporal-polyfill(?:\/|$)/u] },
	entry: { cli: "./src/cli.ts" },
	outDir: "dist",
	tsconfig: "tsconfig.lib.json",
});

const configuration = defineConfig((inlineConfig) => {
	return "asOne" in inlineConfig && inlineConfig.asOne === true
		? mergeConfig(darkroomConfiguration, { outputOptions: { codeSplitting: false } })
		: darkroomConfiguration;
});

export default configuration;
