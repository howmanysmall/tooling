import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { env } from "node:process";
import { describe, it, vi } from "vitest";
import { arkenv, type } from "@arkenv/core";
import { DELETE, isMaybeNonEmptyString, isUndefined } from "@howmanysmall/arktype-utilities";

import { ConfigurationError } from "./configuration-error";
import { createGetEnvironmentAsync } from "./create-get-environment-async";

interface TestEnvironment {
	readonly DARKROOM_MODEL?: string | undefined;
	readonly OPENROUTER_API_KEY?: string | undefined;
}

const API_KEY_PATTERN = /^sk-or-v1-[a-zA-Z0-9]{64}$/u;
const VALID_API_KEY = `sk-or-v1-${"a".repeat(64)}`;

function createTestEnvironment(): TestEnvironment {
	return arkenv(
		{
			"DARKROOM_MODEL?": isMaybeNonEmptyString,
			"OPENROUTER_API_KEY?": type(API_KEY_PATTERN).or(isUndefined),
		},
		{
			emptyAsUndefined: true,
			env,
			onUndeclaredKey: DELETE,
		},
	);
}

function createEnvironmentGetter(): (environmentFile?: string) => Promise<TestEnvironment> {
	return createGetEnvironmentAsync(async () => createTestEnvironment());
}

async function getEnvironmentFromFileAsync(contents: string): Promise<TestEnvironment> {
	const directory = await mkdtemp(nodePath.join(tmpdir(), "environment-"));
	const environmentFile = nodePath.join(directory, ".env");

	try {
		await writeFile(environmentFile, contents);
		return await createEnvironmentGetter()(environmentFile);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
}

async function getRejectionAsync(promise: Promise<unknown>): Promise<Error> {
	try {
		await promise;
	} catch (error) {
		if (error instanceof Error) return error;
		throw error;
	}

	throw new Error("Expected the promise to reject");
}

describe("createGetEnvironmentAsync", () => {
	it("rejects a malformed API key with a configuration error", async ({ expect }) => {
		expect.assertions(2);

		const getEnvironmentAsync = createEnvironmentGetter();
		vi.stubEnv("OPENROUTER_API_KEY", "not-a-key");
		const error = await getRejectionAsync(getEnvironmentAsync("no-such-file.env"));
		vi.unstubAllEnvs();

		expect(error).toBeInstanceOf(ConfigurationError);
		expect(error).toMatchObject({ exitCode: 3 });
	});

	it("lets a .env file override a key exported by the shell", async ({ expect }) => {
		expect.assertions(1);

		const fileApiKey = `sk-or-v1-${"b".repeat(64)}`;
		vi.stubEnv("OPENROUTER_API_KEY", VALID_API_KEY);
		const environment = await getEnvironmentFromFileAsync(`export OPENROUTER_API_KEY="${fileApiKey}"\n`);
		vi.unstubAllEnvs();

		expect(environment.OPENROUTER_API_KEY).toBe(fileApiKey);
	});

	it("returns the parsed environment when the variables are valid", async ({ expect }) => {
		expect.assertions(2);

		vi.stubEnv("DARKROOM_MODEL", "google/gemini-nano-banana-2.1");
		vi.stubEnv("OPENROUTER_API_KEY", VALID_API_KEY);
		const environment = await createEnvironmentGetter()("no-such-file.env");
		vi.unstubAllEnvs();

		expect(environment.DARKROOM_MODEL).toBe("google/gemini-nano-banana-2.1");
		expect(environment.OPENROUTER_API_KEY).toBe(VALID_API_KEY);
	});

	it("caches the parsed environment per environment file", async ({ expect }) => {
		expect.assertions(4);

		const getEnvironmentAsync = createEnvironmentGetter();
		vi.stubEnv("DARKROOM_MODEL", "first-model");
		vi.stubEnv("OPENROUTER_API_KEY", VALID_API_KEY);

		const first = await getEnvironmentAsync("first.env");
		vi.stubEnv("DARKROOM_MODEL", "second-model");
		const cached = await getEnvironmentAsync("first.env");
		const otherFile = await getEnvironmentAsync("second.env");
		vi.unstubAllEnvs();

		expect(cached).toBe(first);
		expect(cached.DARKROOM_MODEL).toBe("first-model");
		expect(otherFile).not.toBe(first);
		expect(otherFile.DARKROOM_MODEL).toBe("second-model");
	});
});
