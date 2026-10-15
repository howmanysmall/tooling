import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { defineConfig, mergeConfig } from "tsdown";

const darkroomConfiguration = mergeConfig(cliConfiguration, {
	// The private workspace packages aren't published, so they are inlined.
	// `temporal-polyfill` stays external via the optional peer: native runtimes
	// never load it, and bundling it would ship ~58KB to everyone.
	deps: { alwaysBundle: [/^@howmanysmall\//u] },
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
