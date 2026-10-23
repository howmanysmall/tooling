import { createGetEnvironmentAsync } from "@howmanysmall/environment/create-get-environment-async";

export const getAiEnvironmentAsync = createGetEnvironmentAsync(async function getPackageAsync() {
	const { aiEnvironment } = await import("./ai-environment");
	return aiEnvironment;
});
