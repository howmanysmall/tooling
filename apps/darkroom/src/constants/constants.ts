import packageJson from "../../package.json" with { type: "json" };

export const description = packageJson.description satisfies string;
export const name = packageJson.name satisfies string;
export const version = packageJson.version satisfies string;
/** The command people type, from the package's `bin`. */
export const commandName = Object.keys(packageJson.bin)[0] ?? name;
export const url = packageJson.author.url satisfies string;

export const NON_SLUG_REGEXP = /[^a-zA-Z0-9-_]/gu;
export const REPEATED_UNDERSCORES = /_{2,}/gu;
export const EDGE_UNDERSCORES = /^_|_$/gu;

export const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
