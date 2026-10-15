import { CliError } from "@howmanysmall/cli-utilities/cli-error";

import { ExitCode } from "./exit-code";

/** `OPENROUTER_API_KEY` is missing or malformed, or no model was chosen. */
export class ConfigurationError extends CliError {
	public override readonly name = "ConfigurationError";

	public constructor(message: string, options?: ErrorOptions) {
		super(message, ExitCode.Configuration, options);
	}
}
