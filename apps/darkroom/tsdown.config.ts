import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { createReactCompilerPlugin } from "@howmanysmall/project-configurations/tsdown/react-compiler";
import { defineConfig, mergeConfig } from "tsdown";

const darkroomConfiguration = mergeConfig(cliConfiguration, {
	// The private workspace packages aren't published, so they are inlined.
	// `temporal-polyfill` stays external via the optional peer: native runtimes
	// never load it, and bundling it would ship ~58KB to everyone.
	// `react-devtools-core` is an optional Ink dependency that is only loaded
	// in development, so it is never bundled.
	deps: { alwaysBundle: [/^@howmanysmall\//u], neverBundle: ["react-devtools-core"] },
	entry: { cli: "./src/cli.ts" },
	outDir: "dist",
	// The history browser's components are compiled with React Compiler.
	plugins: [createReactCompilerPlugin()],
	tsconfig: "tsconfig.lib.json",
});

const configuration = defineConfig((inlineConfig) => {
	return "asOne" in inlineConfig && inlineConfig.asOne === true
		? mergeConfig(darkroomConfiguration, { outputOptions: { codeSplitting: false } })
		: darkroomConfiguration;
});

export default configuration;
