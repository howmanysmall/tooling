import nodePath from "node:path";
import { mergeConfig } from "tsdown";

import { sharedConfiguration } from "./shared.ts";

import type { Rolldown } from "tsdown";

export interface BinConfiguration {
	readonly entry: Record<string, string>;
	readonly outputOptions: { readonly banner: (chunk: Rolldown.RenderedChunk) => string };
	readonly plugins: Array<Rolldown.Plugin>;
}

/**
 * Builds the `<name>` and `<name>-bun` bins. Like knip's `knip` and `knip-bun`,
 * each one is a thin entry that imports the shared CLI and only differs by the
 * runtime its shebang asks for.
 *
 * @param name - The tool's name, which is also its Node bin.
 * @param directory - The tool's directory, holding `src/cli.ts`.
 * @returns The options to spread into the tool's tsdown configuration.
 */
export function createBinConfiguration(name: string, directory: string): BinConfiguration {
	const cliEntry = nodePath.join(directory, "src", "cli.ts");
	const binPrefix = `\0${name}-bin:`;
	const binRuntimes = new Map([
		[`${name}-bun`, "bun"],
		[name, "node"],
	]);

	function getBanner(chunk: Rolldown.RenderedChunk): string {
		const runtime = chunk.isEntry ? binRuntimes.get(chunk.name) : undefined;
		return runtime === undefined ? "" : `#!/usr/bin/env ${runtime}`;
	}

	return {
		entry: Object.fromEntries(Array.from(binRuntimes.keys(), (bin) => [bin, `${binPrefix}${bin}`])),
		outputOptions: { banner: getBanner },
		plugins: [
			{
				name: `${name}:bin-entries`,
				load(id): string | undefined {
					return id.startsWith(binPrefix) ? `import ${JSON.stringify(cliEntry)};` : undefined;
				},
				resolveId(source): Rolldown.ResolveIdResult {
					if (source.startsWith(binPrefix)) return source;
					return source === cliEntry ? { id: cliEntry, moduleSideEffects: true } : undefined;
				},
			},
		],
	};
}

// A plain CLI ships one executable and no importable API, so it has no
// declarations to emit or check.
export const cliConfiguration = mergeConfig(sharedConfiguration, {
	attw: { enabled: false },
	dts: false,
	minify: true,
});

// A configurable CLI also exports `defineConfiguration` and its types for
// configuration files to import, so it keeps declarations and attw.
export const configurableCliConfiguration = mergeConfig(sharedConfiguration, {
	minify: true,
});
