import type { Environment } from "$environment";

let cachedEnvironment: Environment | undefined;

export async function getEnvironmentAsync(): Promise<Environment> {
	if (cachedEnvironment !== undefined) return cachedEnvironment;

	await import("@dotenvx/dotenvx/config");
	const { environment } = await import("$environment");
	cachedEnvironment = environment;
	return cachedEnvironment;
}
