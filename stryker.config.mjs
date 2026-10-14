/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const configuration = {
	$schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
	cleanTempDir: true,
	concurrency: "50%",
	// Stryker defaults this to `true`, which prepends `// @ts-nocheck` to every
	// source file and shifts every line number by one. Nothing runs `tsc` in the
	// sandbox anyway, see `vitest.mutation.config.ts`, which disables
	// typechecking.
	disableTypeChecks: false,
	ignorePatterns: ["/.claude", "/.stryker-tmp", "/.swc", "/.vitiate", "/coverage", "/dist", "/reports"],
	incremental: true,
	// Process wiring and re-exports have no behavior a unit test can pin, so
	// they stay out of the score.
	mutate: [
		"apps/*/src/**/*.ts",
		"!**/*.bench.ts",
		"!**/*.d.ts",
		"!**/*.fuzz.ts",
		"!**/*.test.ts",
		"!apps/*/src/cli.ts",
		"!apps/*/src/constants.ts",
		"!apps/*/src/index.ts",
	],
	plugins: ["@stryker-mutator/vitest-runner"],
	reporters: ["clear-text", "progress", "html"],
	testRunner: "vitest",
	thresholds: {
		break: 70,
		high: 85,
		low: 70,
	},
	// A mutant run pays several seconds of Vitest startup before a test
	// executes, so give slow CI hardware headroom. A genuine infinite loop is
	// still caught.
	timeoutMS: 30_000,
	vitest: {
		configFile: "vitest.mutation.config.ts",
		// `related` asks Vitest which test files import the mutated module, which
		// resolves nothing useful here because imports go through the `$utilities/*`
		// tsconfig path aliases.
		related: false,
	},
};

export default configuration;
