import { readFileSync } from "node:fs";
import nodePath from "node:path";
import process from "node:process";
import { defineConfig } from "tsdown";
import Macros from "unplugin-macros/rolldown";

interface PackageManifest {
	readonly name?: string;
	readonly dependencies?: Readonly<Record<string, string>>;
}

function readManifest(directory: string): PackageManifest | undefined {
	try {
		return JSON.parse(readFileSync(nodePath.join(directory, "package.json"), "utf8")) as PackageManifest;
	} catch {
		return undefined;
	}
}

function escapeRegExp(value: string): string {
	return value.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}

/**
 * JSR packages install from npm.jsr.io under an alias, which npm can't resolve
 * when the published package is installed, so they must be bundled. A
 * catalog specifier hides the `jsr:` protocol, so the installed manifest name
 * (`@jsr/scope__name`) is what identifies them. Tsdown runs in the package
 * directory, so the current directory is the package being built.
 */
function getJsrDependencyPatterns(directory: string): Array<RegExp> {
	const dependencies = Object.keys(readManifest(directory)?.dependencies ?? {});
	const jsrDependencies = dependencies.filter((name) =>
		readManifest(nodePath.join(directory, "node_modules", name))?.name?.startsWith("@jsr/"),
	);

	return [/^@jsr\//u, ...jsrDependencies.map((name) => new RegExp(`^${escapeRegExp(name)}(?:/|$)`, "u"))];
}

// Settings every published package shares; each package's own
// `tsdown.config.ts` adds its entries and output.
export const sharedConfiguration = defineConfig({
	attw: {
		enabled: true,
		level: "error",
		profile: "esm-only",
	},
	clean: true,
	deps: { alwaysBundle: getJsrDependencyPatterns(process.cwd()) },
	dts: {
		generator: "tsgo",
		resolver: "oxc",
		tsgo: {
			path: nodePath.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "tsc"),
		},
	},
	fixedExtension: false,
	format: ["esm"],
	platform: "node",
	plugins: [Macros()],
	publint: {
		enabled: true,
		level: "error",
	},
	treeshake: {
		moduleSideEffects: false,
		propertyReadSideEffects: false,
		unknownGlobalSideEffects: false,
	},
});
