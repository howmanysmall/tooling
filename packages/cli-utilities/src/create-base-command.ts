import { env, exit, stderr } from "node:process";
import { Command, ValidationError } from "@cliffy/command";

import { CliError } from "./cli-error.ts";
import { ShowHelpError } from "./show-help-error.ts";

export interface ExtraOptions {
	readonly showHelpWithoutArguments?: boolean | undefined;
}

export interface CommandErrorIo {
	/** Whether to print stack traces. Defaults to a non-empty `DEBUG`. */
	readonly debug: boolean;
	readonly exit: (code: number) => never;
	readonly writeError: (text: string) => void;
}

/**
 * The subset of a Cliffy command that the error handler needs.
 */
export interface ErrorCommand {
	getMainCommand(): { getName(): string };
	getPath(): string;
	showHelp(): void;
}

function getDefaultIo(): CommandErrorIo {
	return {
		// biome-ignore lint/style/noProcessEnv: DEBUG is read before any app schema exists.
		debug: (env.DEBUG ?? "").length > 0,
		exit,
		writeError(text): void {
			stderr.write(text);
		},
	};
}

function writeStack(error: Error, io: CommandErrorIo): void {
	if (io.debug && error.stack !== undefined) {
		io.writeError(`${error.stack}\n`);
	}
}

/**
 * Prints `error` to stderr and exits with the matching code.
 *
 * - `ShowHelpError`: help on stdout, exit 0.
 * - `ValidationError`: a one-line message and a pointer to `--help`, exit
 *   `error.exitCode`.
 * - `CliError`: `<name>: <message>`, exit `error.exitCode`.
 * - Anything else: `<name>: <message>`, exit 1.
 *
 * Stack traces are printed only when `io.debug` is set.
 *
 * @param error - The thrown value.
 * @param command - The command that was running.
 * @param io - Where to write and how to exit.
 * @returns Never; it always exits.
 */
export function handleCommandError(error: Error, command: ErrorCommand, io: CommandErrorIo = getDefaultIo()): never {
	if (error instanceof ShowHelpError) {
		command.showHelp();
		return io.exit(0);
	}

	writeStack(error, io);

	if (error instanceof ValidationError) {
		io.writeError(`error: ${error.message}\nRun '${command.getPath()} --help' for usage.\n`);
		return io.exit(error.exitCode);
	}

	const rootName = command.getMainCommand().getName();
	io.writeError(`${rootName}: ${error.message}\n`);
	return io.exit(error instanceof CliError ? error.exitCode : 1);
}

export function createBaseCommand(
	name: string,
	version: string | undefined,
	description: string,
	options?: ExtraOptions,
): Command {
	const baseCommand = new Command()
		.error((error, command) => handleCommandError(error, command))
		.name(name)
		.description(description)
		.help({
			colors: true,
			hints: true,
			types: true,
		});

	if (version !== undefined) {
		baseCommand.version(version);
	}

	if (options?.showHelpWithoutArguments === true) {
		baseCommand.action(() => {
			throw new ShowHelpError("No command specified.");
		});
	}

	return baseCommand;
}
