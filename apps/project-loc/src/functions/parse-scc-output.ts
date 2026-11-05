import { type } from "arktype";

import { isSccOutput } from "$types/scc-types";

import type { LanguageStats } from "$types/code-types";

export function parseSccOutput(stdout: string): ReadonlyArray<LanguageStats> | undefined {
	const output = isSccOutput(stdout);
	if (output instanceof type.errors) return undefined;

	if (output === null) {
		return [];
	}

	return output.map((language) => ({
		name: language.Name,
		blank: language.Blank,
		code: language.Code,
		comment: language.Comment,
		complexity: language.Complexity,
		files: language.Count,
	}));
}
