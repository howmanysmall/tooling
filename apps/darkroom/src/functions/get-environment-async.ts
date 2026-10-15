import { ConfigurationError } from "$errors/configuration-error";

import type { Environment } from "$environment";

let cachedEnvironment: Environment | undefined;

export async function getEnvironmentAsync(): Promise<Environment> {
	if (cachedEnvironment !== undefined) return cachedEnvironment;

	const { config } = await import("@dotenvx/dotenvx");
	config({ quiet: true });
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
