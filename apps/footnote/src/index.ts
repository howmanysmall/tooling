/** Settings a `footnote` configuration file can set. */
export interface Configuration {
	/** Prints extra output while running. */
	readonly verbose?: boolean;
}

/**
 * Types the default export of a `footnote` configuration file.
 *
 * @param configuration - The configuration to export.
 * @returns The same configuration.
 */
export function defineConfiguration(configuration: Configuration): Configuration {
	return configuration;
}
