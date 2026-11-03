import nodePath from "node:path";
import { isMaybeReadonlyArrayOfStrings } from "@howmanysmall/arktype-utilities";
import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import { type } from "arktype";
import { loadConfig } from "c12";

import type { LoadConfigOptions } from "c12";

import type { Configuration } from "./index";

/** Matches darkroom's `ExitCode.Configuration`. */
const CONFIGURATION_EXIT_CODE = 3;

// `declare` stops compiling if this schema drifts from `Configuration`.
const isConfiguration = type
	.declare<Configuration>()
	.type({
		"ignore?": isMaybeReadonlyArrayOfStrings,
	})
	.readonly()
	.onUndeclaredKey("reject");

export interface LoadConfigurationOptions {
	/** A `--config` file. It must exist, and it replaces the search. */
	readonly configFile?: string | undefined;
	/** The directory a relative `--config` file resolves from. */
	readonly cwd: string;
	/** The workspace root, the only directory searched for a configuration. */
	readonly root: string;
}

export interface LoadedConfiguration {
	/** The file the configuration came from, if one was found. */
	readonly configFile: string | undefined;
	readonly configuration: Configuration;
}

/**
 * Loads and validates the `footnote` configuration with c12.
 *
 * @param options - Where to search, or which file to load.
 * @param options.configFile - A `--config` file, if one was passed.
 * @param options.cwd - The directory a relative `--config` file resolves from.
 * @param options.root - The workspace root to search.
 * @returns The validated configuration and the file it came from.
 * @rejects {CliError} With exit code 3 when `--config` is missing, the file
 *   fails to load, or the configuration is invalid.
 */
export async function loadConfigurationAsync({
	configFile,
	cwd,
	root,
}: LoadConfigurationOptions): Promise<LoadedConfiguration> {
	const c12Options: LoadConfigOptions<Configuration> = {
		name: "footnote",
		cwd: root,
		rcFile: false,
		schema: isConfiguration,
	};

	if (configFile !== undefined) {
		c12Options.cwd = nodePath.resolve(cwd);
		c12Options.configFile = nodePath.resolve(cwd, configFile);
		c12Options.configFileRequired = true;
	}

	try {
		const resolved = await loadConfig(c12Options);
		return { configFile: resolved._configFile, configuration: resolved.config };
	} catch (error) {
		const message = error instanceof Error ? error.message : "The configuration could not be loaded.";
		// biome-ignore lint/style/useErrorCause: CliError takes the cause as its third argument.
		throw new CliError(message, CONFIGURATION_EXIT_CODE, { cause: error });
	}
}
