import packageJson from "$package" with { type: "json" };

export const description = packageJson.description satisfies string;
export const name = packageJson.name satisfies string;
export const version = packageJson.version satisfies string;

export const PRUNED_DIRECTORIES: ReadonlySet<string> = new Set([
	".build",
	".cache",
	".git",
	".next",
	".turbo",
	".venv",
	"dist",
	"node_modules",
	"Pods",
	"target",
	"venv",
]);

export const MANIFEST_NAMES: ReadonlySet<string> = new Set([
	"build.gradle",
	"build.gradle.kts",
	"Cargo.toml",
	"composer.json",
	"deno.json",
	"deno.jsonc",
	"Gemfile",
	"go.mod",
	"mix.exs",
	"package.json",
	"Package.swift",
	"pom.xml",
	"pyproject.toml",
]);

export const MANIFEST_SUFFIX = ".csproj";
export const GLOB_CHARACTERS_REGEXP = /[\\*?[\]]/gu;

// The order `--json` writes keys in.
export const JSON_KEY_ORDER: ReadonlyArray<string> = [
	"root",
	"projects",
	"total",
	"name",
	"path",
	"files",
	"code",
	"comment",
	"blank",
	"complexity",
	"languages",
];
