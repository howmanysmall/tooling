import { describe, it } from "vitest";
import { ValidationError } from "@cliffy/command";

import { CliError } from "./cli-error";
import { handleCommandError } from "./create-base-command";
import { ShowHelpError } from "./show-help-error";

import type { CommandErrorIo, ErrorCommand } from "./create-base-command";

class ExitSignalError extends Error {
	public readonly code: number;
	public override readonly name = "ExitSignalError";

	public constructor(code: number) {
		super(`exit ${code}`);
		this.code = code;
	}
}

interface Captured {
	readonly code: number;
	readonly helpShown: boolean;
	readonly stderr: string;
}

function runHandler(error: Error, debug = false): Captured {
	let stderrText = "";
	let helpShown = false;
	const command: ErrorCommand = {
		getMainCommand: () => ({ getName: () => "darkroom" }),
		getPath: () => "darkroom generate",
		showHelp(): void {
			helpShown = true;
		},
	};
	const io: CommandErrorIo = {
		debug,
		exit(code): never {
			throw new ExitSignalError(code);
		},
		writeError(text): void {
			stderrText += text;
		},
	};

	try {
		handleCommandError(error, command, io);
	} catch (error_) {
		if (error_ instanceof ExitSignalError) return { code: error_.code, helpShown, stderr: stderrText };
		throw error_;
	}

	throw new Error("handleCommandError returned without exiting");
}

describe("handleCommandError", () => {
	it("prints a validation error to stderr with a help pointer instead of the full help", ({ expect }) => {
		expect.assertions(3);

		const result = runHandler(new ValidationError('Option "--count" must be a number.'));

		expect(result.stderr).toBe(
			"error: Option \"--count\" must be a number.\nRun 'darkroom generate --help' for usage.\n",
		);
		expect(result.code).toBe(2);
		expect(result.helpShown).toBe(false);
	});

	it("uses the exit code carried by a CliError", ({ expect }) => {
		expect.assertions(2);

		const result = runHandler(new CliError("OPENROUTER_API_KEY is not set.", 3));

		expect(result.stderr).toBe("darkroom: OPENROUTER_API_KEY is not set.\n");
		expect(result.code).toBe(3);
	});

	it("prints unknown errors as one line and exits 1", ({ expect }) => {
		expect.assertions(2);

		const result = runHandler(new TypeError("boom"));

		expect(result.stderr).toBe("darkroom: boom\n");
		expect(result.code).toBe(1);
	});

	it("adds the stack trace only in debug mode", ({ expect }) => {
		expect.assertions(2);

		const error = new TypeError("boom");

		expect(runHandler(error, true).stderr).toContain("TypeError: boom\n    at ");
		expect(runHandler(error, false).stderr).not.toContain("    at ");
	});

	it("shows help and exits 0 for ShowHelpError", ({ expect }) => {
		expect.assertions(3);

		const result = runHandler(new ShowHelpError("No command specified."));

		expect(result.helpShown).toBe(true);
		expect(result.code).toBe(0);
		expect(result.stderr).toBe("");
	});
});
