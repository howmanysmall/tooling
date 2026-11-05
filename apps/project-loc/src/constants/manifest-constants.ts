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

export const MANIFEST_SUFFIX = ".csproj";
