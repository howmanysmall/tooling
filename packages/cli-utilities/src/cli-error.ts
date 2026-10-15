/**
 * An expected failure with a known exit code. `createBaseCommand` prints its
 * message as a single line, without a stack trace, and exits with
 * `exitCode`.
 */
export class CliError extends Error {
	public readonly exitCode: number;
	public override readonly name: string = "CliError";

	public constructor(message: string, exitCode: number, options?: ErrorOptions) {
		super(message, options);
		this.exitCode = exitCode;
	}
}
