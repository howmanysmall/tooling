import type { OpenRouter } from "@openrouter/sdk";

let openrouterCache: OpenRouter | undefined;

export async function getOpenRouterAsync(): Promise<OpenRouter> {
	if (openrouterCache !== undefined) return openrouterCache;

	const { OpenRouter } = await import("@openrouter/sdk");

	openrouterCache = new OpenRouter({
		async apiKey(): Promise<string> {
			const environment = await import("$functions/get-environment-async").then(async ({ getEnvironmentAsync }) =>
				getEnvironmentAsync(),
			);
			return environment.OPENROUTER_API_KEY;
		},
	});
	return openrouterCache;
}
