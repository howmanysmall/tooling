import type { OpenRouter } from "@openrouter/sdk";

export async function getOpenRouterAsync(): Promise<OpenRouter> {
	const [{ getOpenRouterAsync: getBaseOpenRouterAsync }, { name, url }] = await Promise.all([
		import("@howmanysmall/ai/get-openrouter-async"),
		import("$constants"),
	]);

	return getBaseOpenRouterAsync({
		appTitle: name,
		httpReferer: url,
	});
}
