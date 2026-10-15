// oxlint-disable eslint/no-template-curly-in-string -- the strings below are shell code, not templates
import { spawnSync } from "node:child_process";
import { describe, it } from "vitest";

import { getOptionValue, injectCompletionContext, readCompletionContext, Shell } from "./completion-context.ts";

const FISH_SCRIPT =
	"complete -c darkroom -s a -l aspect-ratio -a '(darkroom completions complete aspect-ratio generate 2>/dev/null)'\n";
const ZSH_SCRIPT = 'function f {\n  lines="$(darkroom completions complete "${action}" "${@}" 2>/dev/null)"\n}\n';
const BASH_SCRIPT =
	'f() {\n  mapfile -t values < <( darkroom completions complete "${action}" "${@}" 2>/dev/null )\n}\n';

function isInstalled(shell: string): boolean {
	return spawnSync("which", [shell]).status === 0;
}

function checkSyntax(shell: string, script: string): null | number {
	return spawnSync(shell, ["-n"], { input: script }).status;
}

describe("injectCompletionContext", () => {
	it("passes the command line to every completion call", ({ expect }) => {
		expect.assertions(3);

		expect(injectCompletionContext(FISH_SCRIPT, Shell.Fish, "darkroom")).toContain(
			String.raw`(DARKROOM_COMPLETION_SHELL=fish DARKROOM_COMPLETION_WORDS=(string join \n -- (commandline -opc) | string collect) darkroom completions complete aspect-ratio generate`,
		);
		expect(injectCompletionContext(ZSH_SCRIPT, Shell.Zsh, "darkroom")).toContain(
			'DARKROOM_COMPLETION_WORDS="${(pj:\\n:)words}" darkroom completions complete',
		);
		expect(injectCompletionContext(BASH_SCRIPT, Shell.Bash, "darkroom")).toContain(
			[
				'DARKROOM_COMPLETION_WORDS="$(printf',
				String.raw`'%s\n'`,
				'"${COMP_WORDS[@]}")" darkroom completions complete',
			].join(" "),
		);
	});

	it("fails loudly when the script has nothing to patch", ({ expect }) => {
		expect.assertions(1);

		expect(() => injectCompletionContext("echo hi", Shell.Fish, "darkroom")).toThrow(
			'no "darkroom completions complete"',
		);
	});

	it.runIf(isInstalled("fish"))("produces valid fish", ({ expect }) => {
		expect.assertions(1);

		expect(checkSyntax("fish", injectCompletionContext(FISH_SCRIPT, Shell.Fish, "darkroom"))).toBe(0);
	});

	it.runIf(isInstalled("zsh"))("produces valid zsh", ({ expect }) => {
		expect.assertions(1);

		expect(checkSyntax("zsh", injectCompletionContext(ZSH_SCRIPT, Shell.Zsh, "darkroom"))).toBe(0);
	});

	it.runIf(isInstalled("bash"))("produces valid bash", ({ expect }) => {
		expect.assertions(1);

		expect(checkSyntax("bash", injectCompletionContext(BASH_SCRIPT, Shell.Bash, "darkroom"))).toBe(0);
	});
});

describe("readCompletionContext", () => {
	it("splits the words and recognizes the shell", ({ expect }) => {
		expect.assertions(2);

		const context = readCompletionContext({
			DARKROOM_COMPLETION_SHELL: "fish",
			DARKROOM_COMPLETION_WORDS: "darkroom\ngenerate\n-m\nopenai/gpt-image-1",
		});

		expect(context.shell).toBe(Shell.Fish);
		expect(context.words).toStrictEqual(["darkroom", "generate", "-m", "openai/gpt-image-1"]);
	});

	it("is empty when the script was not patched", ({ expect }) => {
		expect.assertions(1);

		expect(readCompletionContext({})).toStrictEqual({ shell: undefined, words: [] });
	});
});

describe("getOptionValue", () => {
	it("reads short, long, and = forms, preferring the last", ({ expect }) => {
		expect.assertions(4);

		const flags = ["-m", "--model"];

		expect(getOptionValue(["generate", "-m", "a/b"], flags)).toBe("a/b");
		expect(getOptionValue(["generate", "--model", "a/b"], flags)).toBe("a/b");
		expect(getOptionValue(["generate", "--model=c/d"], flags)).toBe("c/d");
		expect(getOptionValue(["generate", "-m", "a/b", "--model=c/d"], flags)).toBe("c/d");
	});
});
