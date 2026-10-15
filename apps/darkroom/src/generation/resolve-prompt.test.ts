import { describe, it } from "vitest";

import { resolvePromptAsync } from "./resolve-prompt.ts";

import type { PromptSources } from "./resolve-prompt.ts";

function createSources(overrides: Partial<PromptSources>): PromptSources {
	return { isStdinTty: true, readStdinAsync: async () => "from stdin", ...overrides };
}

describe("resolvePromptAsync", () => {
	it("prefers the positional prompt and reads stdin for -", async ({ expect }) => {
		expect.assertions(2);

		const positional = createSources({ positional: "  a cat  " });
		const dash = createSources({ positional: "-" });

		await expect(resolvePromptAsync(positional)).resolves.toBe("a cat");
		await expect(resolvePromptAsync(dash)).resolves.toBe("from stdin");
	});

	it("rejects a positional prompt combined with --prompt-file", async ({ expect }) => {
		expect.assertions(1);

		const both = createSources({ positional: "a cat", promptFile: "p.md" });

		await expect(resolvePromptAsync(both)).rejects.toThrow("not both");
	});

	it("reads piped stdin when nothing else is given, and asks only on a terminal", async ({ expect }) => {
		expect.assertions(2);

		const piped = createSources({ isStdinTty: false });
		const asked = createSources({ askAsync: async () => "asked" });

		await expect(resolvePromptAsync(piped)).resolves.toBe("from stdin");
		await expect(resolvePromptAsync(asked)).resolves.toBe("asked");
	});

	it("fails with a usage error when there is no source or the prompt is empty", async ({ expect }) => {
		expect.assertions(2);

		const none = createSources({});
		const blank = createSources({ positional: "\t\n" });

		await expect(resolvePromptAsync(none)).rejects.toThrow("No prompt given");
		await expect(resolvePromptAsync(blank)).rejects.toThrow("The prompt is empty.");
	});
});
