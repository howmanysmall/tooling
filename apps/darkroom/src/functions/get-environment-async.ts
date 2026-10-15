import { ConfigurationError } from "$errors/configuration-error";

import type { Environment } from "$environment";

let cachedEnvironment: Environment | undefined;

/**
 * Loads and validates the environment once.
 *
 * A `.env` file in the working directory overrides variables already set in
 * the shell, so a project-specific key (such as a spending-limited one) wins
 * over a key exported globally.
 *
 * @param environmentFile - The `.env` file to load, for tests.
 * @returns The validated environment.
 * @rejects A `ConfigurationError` (exit 3) when a variable is malformed.
 */
export async function getEnvironmentAsync(environmentFile = ".env"): Promise<Environment> {
	if (cachedEnvironment !== undefined) return cachedEnvironment;

	const { config } = await import("@dotenvx/dotenvx");
	config({ ignore: ["MISSING_ENV_FILE"], overload: true, path: environmentFile, quiet: true });
	try {
		const { environment } = await import("$environment");
		cachedEnvironment = environment;
	} catch (error) {
		if (error instanceof Error && error.name === "ArkEnvError") {
			throw new ConfigurationError(`Invalid environment:\n${error.message}`, { cause: error });
		}
		throw error;
	}
	return cachedEnvironment;
}
