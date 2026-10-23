import process from "node:process";
import { parseEnv } from "node:util";

import { ConfigurationError } from "./configuration-error";
import { readEnvironmentFileAsync } from "./read-environment-file-async";

export function createGetEnvironmentAsync<TEnvironment>(
	// oxlint-disable-next-line small-rules/prevent-abbreviations -- "arkenv" is the library name
	getArkEnv: () => Promise<TEnvironment>,
): (environmentFile?: string) => Promise<TEnvironment> {
	const cachedEnvironments = new Map<string, TEnvironment>();

	return async function getEnvironmentAsync(environmentFile = ".env"): Promise<TEnvironment> {
		const cachedEnvironment = cachedEnvironments.get(environmentFile);
		if (cachedEnvironment !== undefined) return cachedEnvironment;

		const text = await readEnvironmentFileAsync(environmentFile);
		// biome-ignore lint/style/noProcessEnv: what do you expect me to do?
		if (text !== undefined) Object.assign(process.env, parseEnv(text));

		try {
			const environment = await getArkEnv();
			cachedEnvironments.set(environmentFile, environment);
			return environment;
		} catch (error) {
			if (error instanceof Error && error.name === "ArkEnvError") {
				throw new ConfigurationError(`Invalid environment:\n${error.message}`, { cause: error });
			}

			throw error;
		}
	};
}
