import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { mergeConfig } from "tsdown";

const configuration = mergeConfig(cliConfiguration, {
	// The private workspace packages aren't published, so they are inlined.
	deps: { alwaysBundle: [/^@howmanysmall\//u] },
	entry: { cli: "./src/cli.ts" },
	outDir: "dist",
	tsconfig: "tsconfig.lib.json",
});

export default configuration;
