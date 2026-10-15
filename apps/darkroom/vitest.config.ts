import { createReactCompilerPlugin } from "@howmanysmall/project-configurations/tsdown/react-compiler";
import { createPackageConfiguration } from "@howmanysmall/project-configurations/vitest";
import { mergeConfig } from "vitest/config";

// Tests run the same React Compiler output that the build ships, so a bug
// the compiler hides or causes shows up here too.
const configuration = mergeConfig(createPackageConfiguration("darkroom"), {
	plugins: [createReactCompilerPlugin()],
});

export default configuration;
