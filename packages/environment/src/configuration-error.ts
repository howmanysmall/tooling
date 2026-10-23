import { CliError } from "@howmanysmall/cli-utilities/cli-error";

/** `OPENROUTER_API_KEY` is missing or malformed, or no model was chosen. */
export class ConfigurationError extends CliError {
	public override readonly name = "ConfigurationError";

	public constructor(message: string, errorOptions?: ErrorOptions) {
		super(message, 3, errorOptions);
	}
}
