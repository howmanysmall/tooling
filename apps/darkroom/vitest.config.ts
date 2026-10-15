import { createPackageConfiguration } from "@howmanysmall/project-configurations/vitest";
import { mergeConfig } from "vitest/config";

const configuration = mergeConfig(createPackageConfiguration("darkroom"), {
	test: { setupFiles: ["./vitest.setup.ts"] },
});

export default configuration;
