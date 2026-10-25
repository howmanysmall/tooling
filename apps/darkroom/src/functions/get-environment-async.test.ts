import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, it, vi } from "vitest";

import type { Environment } from "$environment";

const VALID_KEY = `sk-or-v1-${"a".repeat(64)}`;

async function loadWithEnvironmentAsync(
	variables: Readonly<Record<string, string>>,
): Promise<PromiseSettledResult<Environment>> {
	for (const [key, value] of Object.entries(variables)) {
		vi.stubEnv(key, value);
	}

	vi.resetModules();
	const { getEnvironmentAsync } = await import("./get-environment-async.ts");
	// A path with no file, so the real .env never overrides the stubbed values.
	const [result] = await Promise.allSettled([getEnvironmentAsync("no-such-file.env")]);
	vi.unstubAllEnvs();
	return result;
}

describe("getEnvironmentAsync", () => {
	it("rejects a malformed API key with a configuration error", async ({ expect }) => {
		expect.assertions(1);

		const result = await loadWithEnvironmentAsync({ OPENROUTER_API_KEY: "not-a-key" });

		expect(result).toMatchObject({ reason: { name: "ConfigurationError", exitCode: 3 }, status: "rejected" });
	});

	it("lets a .env file override a key exported by the shell", async ({ expect }) => {
		expect.assertions(1);

		const directory = await mkdtemp(nodePath.join(tmpdir(), "darkroom-env-"));
		const environmentFile = nodePath.join(directory, ".env");
		const fileKey = `sk-or-v1-${"b".repeat(64)}`;
		await writeFile(environmentFile, `export OPENROUTER_API_KEY="${fileKey}"\n`);
		vi.stubEnv("OPENROUTER_API_KEY", VALID_KEY);
		vi.resetModules();
		const { getEnvironmentAsync } = await import("./get-environment-async.ts");
		const [result] = await Promise.allSettled([getEnvironmentAsync(environmentFile)]);
		vi.unstubAllEnvs();

		expect(result).toMatchObject({ status: "fulfilled", value: { OPENROUTER_API_KEY: fileKey } });
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
