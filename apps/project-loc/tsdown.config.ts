import { cliConfiguration, createBinConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { defineConfig, mergeConfig } from "tsdown";

const configuration = defineConfig(
	mergeConfig(cliConfiguration, {
		...createBinConfiguration("project-loc", import.meta.dirname),
		// The private workspace packages aren't published, so they are inlined.
		deps: { alwaysBundle: [/^@howmanysmall\//u] },
		outDir: "dist",
		tsconfig: "tsconfig.lib.json",
	}),
);

export default configuration;
