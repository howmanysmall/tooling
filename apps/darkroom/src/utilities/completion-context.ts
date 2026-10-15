// oxlint-disable eslint/no-template-curly-in-string -- the strings below are shell code, not templates
import { env } from "node:process";

// Cliffy's `completions complete <action> <command…>` only tells a completion
// handler which command it is in, not what else is on the command line. The
// generated shell scripts are patched to pass the current words through these
// variables, so `darkroom generate -m some/model -a <Tab>` can offer only that
// model's aspect ratios.

const SHELL_VARIABLE = "DARKROOM_COMPLETION_SHELL";
const WORDS_VARIABLE = "DARKROOM_COMPLETION_WORDS";

export const enum Shell {
	Bash = "bash",
	Fish = "fish",
	Zsh = "zsh",
}

/** How each shell exposes the words typed so far, joined by newlines. */
const WORDS_EXPRESSIONS: Readonly<Record<Shell, string>> = {
	[Shell.Bash]: ['"$(printf', String.raw`'%s\n'`, '"${COMP_WORDS[@]}")"'].join(" "),
	[Shell.Fish]: "(string join \\n -- (commandline -opc) | string collect)",
	[Shell.Zsh]: '"${(pj:\\n:)words}"',
};

/**
 * Prefixes every `<name> completions complete` call in a generated completion
 * script with the variables that carry the command line.
 *
 * @param script - The script from `generateShellCompletions`.
 * @param shell - Which shell it is for.
 * @param name - The program name, `darkroom`.
 * @returns The patched script.
 * @throws {Error} When the script has no call to patch, so a Cliffy update that
 *   changes the template fails loudly instead of losing the context.
 */
export function injectCompletionContext(script: string, shell: Shell, name: string): string {
	const call = `${name} completions complete `;
	if (!script.includes(call)) {
		throw new Error(`The ${shell} completion script has no "${call.trim()}" call to patch.`);
	}

	const prefix = `${SHELL_VARIABLE}=${shell} ${WORDS_VARIABLE}=${WORDS_EXPRESSIONS[shell]} `;
	// split and join, because a replaceAll replacement would interpret the `$`
	// in the shell code.
	return script.split(call).join(`${prefix}${call}`);
}

export interface CompletionContext {
	/** The shell asking, when the script was patched. */
	readonly shell: Shell | undefined;
	/** The words typed before the one being completed. */
	readonly words: ReadonlyArray<string>;
}

const SHELLS: ReadonlySet<string> = new Set([Shell.Bash, Shell.Fish, Shell.Zsh]);

function isShell(value: string): value is Shell {
	return SHELLS.has(value);
}

/**
 * Reads the command line passed in by a patched completion script.
 *
 * @param variables - The environment, for tests.
 * @returns The words so far, empty when the script was not patched.
 */
export function readCompletionContext(
	variables: Readonly<Record<string, string | undefined>> = env,
): CompletionContext {
	const shell = variables[SHELL_VARIABLE] ?? "";
	const words = variables[WORDS_VARIABLE] ?? "";
	return {
		shell: isShell(shell) ? shell : undefined,
		words: words === "" ? [] : words.split("\n"),
	};
}

/**
 * Finds the last value given for an option, in any of the forms `-m x`,
 * `--model x`, or `--model=x`.
 *
 * @param words - The words typed so far.
 * @param flags - The option's names, such as `["-m", "--model"]`.
 * @returns The value, or `undefined` when the option is absent.
 */
export function getOptionValue(words: ReadonlyArray<string>, flags: ReadonlyArray<string>): string | undefined {
	const flagSet = new Set(flags);
	let value: string | undefined;
	for (const [index, word] of words.entries()) {
		if (flagSet.has(word)) value = words[index + 1];
		for (const flag of flags) {
			if (flag.startsWith("--") && word.startsWith(`${flag}=`)) value = word.slice(flag.length + 1);
		}
	}
	return value;
}
