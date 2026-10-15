import { ConfigurationError } from "$errors/configuration-error";

import type { OpenRouter } from "@openrouter/sdk";

let openrouterCache: OpenRouter | undefined;

export async function getOpenRouterAsync(): Promise<OpenRouter> {
	if (openrouterCache !== undefined) return openrouterCache;
	const [{ OpenRouter }, { name, url }] = await Promise.all([import("@openrouter/sdk"), import("$constants")]);

	openrouterCache = new OpenRouter({
		async apiKey(): Promise<string> {
			const environment = await import("$functions/get-environment-async").then(async ({ getEnvironmentAsync }) =>
				getEnvironmentAsync(),
			);
			if (environment.OPENROUTER_API_KEY === undefined) {
				throw new ConfigurationError(
					"OPENROUTER_API_KEY is not set. Add it to your environment or a .env file.",
				);
			}
			return environment.OPENROUTER_API_KEY;
		},
		appTitle: name,
		httpReferer: url,
	});
	return openrouterCache;
}
