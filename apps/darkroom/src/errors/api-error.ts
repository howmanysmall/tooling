import { CliError } from "@howmanysmall/cli-utilities/cli-error";

import { ExitCode } from "./exit-code";

/** The API or the provider failed. */
export class ApiError extends CliError {
	public override readonly name = "ApiError";

	public constructor(message: string, options?: ErrorOptions) {
		super(message, ExitCode.Api, options);
	}
}
