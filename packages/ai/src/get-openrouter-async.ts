import { ConfigurationError } from "@howmanysmall/environment/configuration-error";

import type { OpenRouter, SDKOptions } from "@openrouter/sdk";
import type { Except } from "type-fest";

/** Options forwarded to the SDK. The API key is supplied lazily instead. */
export type OpenRouterOptions = Except<SDKOptions, "apiKey">;

let openrouter: OpenRouter | undefined;

export async function getOpenRouterAsync(options: OpenRouterOptions = {}): Promise<OpenRouter> {
	if (openrouter !== undefined) return openrouter;

	const { OpenRouter } = await import("@openrouter/sdk");
	openrouter = new OpenRouter({
		...options,
		async apiKey(): Promise<string> {
			const environment = await import("./get-ai-environment-async").then(async ({ getAiEnvironmentAsync }) =>
				getAiEnvironmentAsync(),
			);

			if (environment.OPENROUTER_API_KEY === undefined) {
				throw new ConfigurationError(
					"OPENROUTER_API_KEY is not set. Add it to your environment or a .env file; for the MCP server, add it to the env of darkroom's entry in your client's config.",
				);
			}

			return environment.OPENROUTER_API_KEY;
		},
	});
	return openrouter;
}
