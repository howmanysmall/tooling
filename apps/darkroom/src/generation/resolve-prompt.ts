import { readFile } from "node:fs/promises";
import { ValidationError } from "@cliffy/command";

export interface PromptSources {
	/** Asks interactively. Only called when stdin is a terminal. */
	readonly askAsync?: (() => Promise<string>) | undefined;
	readonly isStdinTty: boolean;
	/** The positional `[prompt]`. `-` means stdin. */
	readonly positional?: string | undefined;
	readonly promptFile?: string | undefined;
	readonly readStdinAsync: () => Promise<string>;
}

async function readPromptFileAsync(path: string): Promise<string> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		throw new ValidationError(`Could not read --prompt-file ${path}: ${error.message}`, { cause: error });
	}
}

async function readFromSourceAsync(sources: PromptSources): Promise<string> {
	if (sources.positional !== undefined && sources.promptFile !== undefined) {
		throw new ValidationError("Give the prompt either as an argument or with --prompt-file, not both.");
	}

	if (sources.positional === "-") return sources.readStdinAsync();
	if (sources.positional !== undefined) return sources.positional;
	if (sources.promptFile !== undefined) return readPromptFileAsync(sources.promptFile);
	if (!sources.isStdinTty) return sources.readStdinAsync();
	if (sources.askAsync !== undefined) return sources.askAsync();

	throw new ValidationError("No prompt given. Pass it as an argument, with --prompt-file, or on stdin.");
}

/**
 * Reads the prompt from exactly one source: the positional argument (`-`
 * for stdin), `--prompt-file`, piped stdin, or an interactive prompt.
 *
 * @param sources - The available sources.
 * @returns The trimmed prompt.
 * @rejects A `ValidationError` when no source applies, both a positional
 *   prompt and `--prompt-file` are given, or the prompt is empty.
 */
export async function resolvePromptAsync(sources: PromptSources): Promise<string> {
	const text = await readFromSourceAsync(sources);
	const prompt = text.trim();
	if (prompt.length === 0) {
		throw new ValidationError("The prompt is empty.");
	}

	return prompt;
}
