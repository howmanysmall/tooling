import nodePath from "node:path";
import { cliConfiguration } from "@howmanysmall/project-configurations/tsdown/cli";
import { createReactCompilerPlugin } from "@howmanysmall/project-configurations/tsdown/react-compiler";
import { defineConfig, mergeConfig } from "tsdown";

import type { Rolldown } from "tsdown";

const CLI_ENTRY = nodePath.join(import.meta.dirname, "src", "cli.ts");
const BIN_PREFIX = "\0darkroom-bin:";

// Like knip's `knip` and `knip-bun`, each bin is a thin entry that imports the
// shared CLI and only differs by the runtime its shebang asks for.
const BIN_RUNTIMES = new Map([
	["darkroom", "node"],
	["darkroom-bun", "bun"],
]);
const BIN_ENTRIES = Array.from(BIN_RUNTIMES.keys(), (name): [string, string] => [name, `${BIN_PREFIX}${name}`]);

type Plugin = ReturnType<typeof createReactCompilerPlugin>;

function createBinEntriesPlugin(): Plugin {
	return {
		name: "darkroom:bin-entries",
		load(id): string | undefined {
			return id.startsWith(BIN_PREFIX) ? `import ${JSON.stringify(CLI_ENTRY)};` : undefined;
		},
		resolveId(source): Rolldown.ResolveIdResult {
			if (source.startsWith(BIN_PREFIX)) return source;
			return source === CLI_ENTRY ? { id: CLI_ENTRY, moduleSideEffects: true } : undefined;
		},
	};
}

const darkroomConfiguration = mergeConfig(cliConfiguration, {
	// The private workspace packages aren't published, so they are inlined.
	// `temporal-polyfill` stays external via the optional peer: native runtimes
	// never load it, and bundling it would ship ~58KB to everyone.
	// `react-devtools-core` is an optional Ink dependency that is only loaded
	// in development, so it is never bundled.
	deps: { alwaysBundle: [/^@howmanysmall\//u], neverBundle: ["react-devtools-core"] },
	entry: Object.fromEntries(BIN_ENTRIES),
	outDir: "dist",
	outputOptions: {
		banner: (chunk): string => {
			const runtime = chunk.isEntry ? BIN_RUNTIMES.get(chunk.name) : undefined;
			return runtime === undefined ? "" : `#!/usr/bin/env ${runtime}`;
		},
	},
	// The history browser's components are compiled with React Compiler.
	plugins: [createBinEntriesPlugin(), createReactCompilerPlugin()],
	tsconfig: "tsconfig.lib.json",
});

const configuration = defineConfig((inlineConfig) => {
	return "asOne" in inlineConfig && inlineConfig.asOne === true
		? mergeConfig(darkroomConfiguration, { outputOptions: { codeSplitting: false } })
		: darkroomConfiguration;
});

export default configuration;
