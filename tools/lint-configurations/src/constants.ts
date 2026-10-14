export const baseIgnores = ["**/*.js", ".mise/**", "**/generated/**", ".vale/**"] satisfies ReadonlyArray<string>;

export const projectType: "app" | "game" | "package" = "package";

export const commitTypes = [
	"build",
	"chore",
	"ci",
	"docs",
	"feat",
	"fix",
	"perf",
	"refactor",
	"style",
	"test",
] satisfies ReadonlyArray<string>;
