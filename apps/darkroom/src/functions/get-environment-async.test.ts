import { describe, it, vi } from "vitest";

import type { Environment } from "$environment";

const VALID_KEY = `sk-or-v1-${"a".repeat(64)}`;

async function loadWithEnvironmentAsync(
	variables: Readonly<Record<string, string>>,
): Promise<PromiseSettledResult<Environment>> {
	for (const [key, value] of Object.entries(variables)) vi.stubEnv(key, value);
	vi.resetModules();
	const { getEnvironmentAsync } = await import("./get-environment-async.ts");
	const [result] = await Promise.allSettled([getEnvironmentAsync()]);
	vi.unstubAllEnvs();
	return result;
}

describe("getEnvironmentAsync", () => {
	it("rejects a malformed API key with a configuration error", async ({ expect }) => {
		expect.assertions(1);

		const result = await loadWithEnvironmentAsync({ OPENROUTER_API_KEY: "not-a-key" });

		expect(result).toMatchObject({ reason: { name: "ConfigurationError", exitCode: 3 }, status: "rejected" });
	});

	it("returns the parsed environment when the key is valid", async ({ expect }) => {
		expect.assertions(1);

		const result = await loadWithEnvironmentAsync({
			DARKROOM_MODEL: "google/gemini-nano-banana-2.1",
			OPENROUTER_API_KEY: VALID_KEY,
		});

		expect(result).toMatchObject({
			status: "fulfilled",
			value: { DARKROOM_MODEL: "google/gemini-nano-banana-2.1", OPENROUTER_API_KEY: VALID_KEY },
		});
	});
});
