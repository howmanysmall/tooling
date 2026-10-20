import nodePath from "node:path";
import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { defineConfig, mergeConfig } from "tsdown";

import type { Rolldown } from "tsdown";

const CLI_ENTRY = nodePath.join(import.meta.dirname, "src", "cli.ts");
const BIN_PREFIX = "\0colorful-bin:";

// Like knip's `knip` and `knip-bun`, each bin is a thin entry that imports the
// shared CLI and only differs by the runtime its shebang asks for.
const BIN_RUNTIMES = new Map([
	["colorful", "node"],
	["colorful-bun", "bun"],
]);
const BIN_ENTRIES = Array.from(BIN_RUNTIMES.keys(), (name): [string, string] => [name, `${BIN_PREFIX}${name}`]);

function createBinEntriesPlugin(): Rolldown.Plugin {
	return {
		name: "colorful:bin-entries",
		load(id): string | undefined {
			return id.startsWith(BIN_PREFIX) ? `import ${JSON.stringify(CLI_ENTRY)};` : undefined;
		},
		resolveId(source): Rolldown.ResolveIdResult {
			if (source.startsWith(BIN_PREFIX)) return source;
			return source === CLI_ENTRY ? { id: CLI_ENTRY, moduleSideEffects: true } : undefined;
		},
	};
}

const configuration = defineConfig(
	mergeConfig(cliConfiguration, {
		// The private workspace packages aren't published, so they are inlined.
		deps: { alwaysBundle: [/^@howmanysmall\//u] },
		entry: Object.fromEntries(BIN_ENTRIES),
		outDir: "dist",
		outputOptions: {
			banner: (chunk): string => {
				const runtime = chunk.isEntry ? BIN_RUNTIMES.get(chunk.name) : undefined;
				return runtime === undefined ? "" : `#!/usr/bin/env ${runtime}`;
			},
		},
		plugins: [createBinEntriesPlugin()],
		tsconfig: "tsconfig.lib.json",
	}),
);

export default configuration;
