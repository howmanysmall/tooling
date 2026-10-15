import { availableParallelism } from "node:os";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";

import type { ViteUserConfig } from "vitest/config";

const cpuCount = availableParallelism();
const workerCount = Math.max(2, Math.min(cpuCount - 1, 12));

export const sharedConfiguration = defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: "node",
		fileParallelism: true,
		fsModuleCache: true,
		globals: true,
		isolate: false,
		maxWorkers: workerCount,
		passWithNoTests: true,
		pool: "forks",
		setupFiles: [fileURLToPath(new URL("setup.ts", import.meta.url))],
		testTimeout: 30_000,
	},
});

/**
 * The Vitest project for one workspace package, whose tests are the
 * `*.test.ts` files beside its source in `src`.
 *
 * @param name - Project name, matching the package name without its scope.
 * @returns The package's Vitest configuration.
 */
export function createPackageConfiguration(name: string): ViteUserConfig {
	return mergeConfig(sharedConfiguration, {
		test: {
			name,
			include: ["src/**/*.test.ts"],
			// turbo streams every package into one terminal, where the live
			// summary rewrites lines that belong to other packages.
			// biome-ignore lint/style/noProcessEnv: shut up?
			reporters: env.TURBO_HASH === undefined ? ["default"] : [["default", { summary: false }]],
			testTimeout: 5_000,
		},
	});
}
