import { readFile } from "node:fs/promises";
import process from "node:process";
import { parseEnv } from "node:util";

import { ConfigurationError } from "$errors/configuration-error";

import type { Environment } from "$environment";

let cachedEnvironment: Environment | undefined;

async function readEnvironmentFileAsync(environmentFile: string): Promise<string | undefined> {
	try {
		return await readFile(environmentFile, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
		throw error;
	}
}

/**
 * Loads and validates the environment once.
 *
 * A `.env` file in the working directory overrides variables already set in
 * the shell, so a project-specific key (such as a spending-limited one) wins
 * over a key exported globally. `process.loadEnvFile` never overrides, so the
 * file is parsed with `parseEnv` and assigned instead.
 *
 * @param environmentFile - The `.env` file to load, for tests.
 * @returns The validated environment.
 * @rejects A `ConfigurationError` (exit 3) when a variable is malformed.
 */
export async function getEnvironmentAsync(environmentFile = ".env"): Promise<Environment> {
	if (cachedEnvironment !== undefined) return cachedEnvironment;

	const text = await readEnvironmentFileAsync(environmentFile);
	// biome-ignore lint/style/noProcessEnv: what do you expect me to do?
	if (text !== undefined) {
		Object.assign(process.env, parseEnv(text));
	}

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
