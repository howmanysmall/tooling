/** Settings a `footnote` configuration file can set. */
export interface Configuration {
	/** Workspace-relative globs for projects footnote leaves alone. */
	readonly ignore?: ReadonlyArray<string> | undefined;
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
