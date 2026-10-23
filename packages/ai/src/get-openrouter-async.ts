import type { OpenRouter } from "@openrouter/sdk";

let openrouter: OpenRouter | undefined;

export async function getOpenRouterAsync(): Promise<OpenRouter> {
	if (openrouter) return openrouter;

	const { OpenRouter } = await import("@openrouter/sdk");
	openrouter = new OpenRouter({
		async apiKey() {
			const environment = await import("./get-ai-environment-async").then(async ({ getAiEnvironmentAsync }) =>
				getAiEnvironmentAsync(),
			);

			if (environment.OPENROUTER_API_KEY === undefined) {
				throw new Error(
					"OPENROUTER_API_KEY is required to use OpenRouter. Please set it in your environment variables.",
				);
			}

			return environment.OPENROUTER_API_KEY;
		},
	});
	return openrouter;
}
