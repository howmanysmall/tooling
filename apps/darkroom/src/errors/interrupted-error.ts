import { CliError } from "@howmanysmall/cli-utilities/cli-error";

import { ExitCode } from "./exit-code";

/** The user pressed Ctrl-C. */
export class InterruptedError extends CliError {
	public override readonly name = "InterruptedError";

	public constructor(message = "Interrupted.", options?: ErrorOptions) {
		super(message, ExitCode.Interrupted, options);
	}
}
