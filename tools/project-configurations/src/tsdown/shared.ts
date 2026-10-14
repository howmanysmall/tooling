import { readFileSync } from "node:fs";
import nodePath from "node:path";
import process from "node:process";
import { type } from "arktype";
import { defineConfig } from "tsdown";
import Macros from "unplugin-macros/rolldown";

const isPackageManifest = type({
	"dependencies?": type("Record<string, string>").readonly().or("undefined"),
	"name?": "string | undefined",
}).readonly();
type PackageManifest = typeof isPackageManifest.infer;

function readManifest(directory: string): PackageManifest | undefined {
	try {
		const contents = readFileSync(nodePath.join(directory, "package.json"), "utf8");
		return isPackageManifest.assert(JSON.parse(contents));
	} catch {
		return undefined;
	}
}

function escapeRegExp(value: string): string {
	return value.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}
const JSR_REGEXP = /^@jsr\//u;

function getJsrDependencyPatterns(directory: string): Array<RegExp> {
	const dependencies = Object.keys(readManifest(directory)?.dependencies ?? {});
	const jsrDependencies = dependencies.filter(
		(name) => readManifest(nodePath.join(directory, "node_modules", name))?.name?.startsWith("@jsr/") === true,
	);

	return [JSR_REGEXP, ...jsrDependencies.map((name) => new RegExp(`^${escapeRegExp(name)}(?:/|$)`, "u"))];
}

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
