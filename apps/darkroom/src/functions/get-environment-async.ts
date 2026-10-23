import { createGetEnvironmentAsync } from "@howmanysmall/environment/create-get-environment-async";

export const getEnvironmentAsync = createGetEnvironmentAsync(async function getPackageAsync() {
	const { environment } = await import("$environment");
	return environment;
});
