import { mergeConfig } from "tsdown";

import { sharedConfiguration } from "./shared.ts";

// A plain CLI ships one executable and no importable API, so it has no
// declarations to emit or check.
export const cliConfiguration = mergeConfig(sharedConfiguration, {
	attw: { enabled: false },
	dts: false,
	minify: true,
});

// A configurable CLI also exports `defineConfiguration` and its types for
// configuration files to import, so it keeps declarations and attw.
export const configurableCliConfiguration = mergeConfig(sharedConfiguration, {
	minify: true,
});
