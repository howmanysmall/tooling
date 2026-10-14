import { mergeConfig } from "vitest/config";

import { sharedConfiguration } from "./shared.ts";

/**
 * Config used by Stryker's Vitest runner.
 *
 * Flat on purpose: `stryker.config.mjs` only mutates the tools in `apps/`,
 * so pulling in the `projects` list would run the shared packages' suites
 * for each mutant without any of them being able to kill one. Stryker also
 * overrides `pool`, `maxWorkers`, `maxConcurrency`, `bail`, and `coverage` at
 * the CLI layer, which resolves cleanly against a single config but not
 * across separately-loaded project configs.
 */
export const strykerConfiguration = mergeConfig(sharedConfiguration, {
	test: {
		name: "apps",
		coverage: { enabled: false },
		include: ["apps/*/src/**/*.test.ts"],
		// Stryker swaps the active mutant between runs, so each file needs a
		// fresh module registry.
		isolate: true,
		restoreMocks: true,
		typecheck: { enabled: false },
	},
});
