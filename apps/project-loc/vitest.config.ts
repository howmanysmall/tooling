import { createPackageConfiguration } from "@howmanysmall/project-configurations/vitest";
import { mergeConfig } from "vitest/config";

const packageConfiguration = createPackageConfiguration("project-loc");

const configuration = mergeConfig(packageConfiguration, {
	test: {
		coverage: {
			enabled: true,
		},
	},
});

export default configuration;
