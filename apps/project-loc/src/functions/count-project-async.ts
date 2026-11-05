import { parseSccOutput } from "./parse-scc-output";

import type { CountedProject } from "$types/code-types";

export async function countProjectAsync(path: string, ignoreFile?: string): Promise<CountedProject | undefined> {
	const ignoreArguments = ignoreFile === undefined ? [] : ["--ignore-file", ignoreFile];

	try {
		const { exitCode, stdout } = await import("tinyexec").then(({ exec }) => {
			return exec("scc", ["--format", "json", ...ignoreArguments, path], {
				nodePath: false,
			});
		});

		if (exitCode !== 0) return undefined;

		const languages = parseSccOutput(stdout);
		return languages === undefined ? undefined : { languages, path };
	} catch {
		return undefined;
	}
}
