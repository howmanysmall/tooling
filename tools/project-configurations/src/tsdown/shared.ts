import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import nodePath from "node:path";
import process from "node:process";
import { type } from "arktype";
import { ResolverFactory } from "rolldown/experimental";
import { defineConfig } from "tsdown";
import { unrunRunner } from "unplugin-macros";
import Macros from "unplugin-macros/rolldown";

import { stripArktypeTypeCasts } from "./strip-arktype-type-casts.ts";

import type { MacroRunner } from "unplugin-macros";

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

const macroResolver = new ResolverFactory({
	conditionNames: ["import", "node", "default"],
	extensionAlias: { ".js": [".ts", ".js"], ".mjs": [".mts", ".mjs"] },
	extensions: [".ts", ".mts", ".js", ".mjs", ".json"],
	tsconfig: "auto",
});

function createMacroRunner(): MacroRunner {
	return {
		...unrunRunner(),
		resolve(source, importer): string {
			if (isBuiltin(source)) return source;

			const { error, path } = macroResolver.resolveFileSync(importer, source);
			if (path === undefined) {
				throw new Error(`Cannot resolve macro "${source}" from ${importer}: ${error}`);
			}
			return path;
		},
	};
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
			path: nodePath.join(import.meta.dirname, "..", "..", "node_modules", ".bin", "tsrs"),
		},
	},
	fixedExtension: false,
	format: ["esm"],
	platform: "node",
	plugins: [Macros({ runner: createMacroRunner() }), stripArktypeTypeCasts()],
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
