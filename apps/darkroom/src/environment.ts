import { env } from "node:process";
import { arkenv, type } from "@arkenv/core";
import { isMaybeNonEmptyString, isUndefined } from "@howmanysmall/arktype-utilities";

/**
 * Environment variable schema for server-side or runtime-only validation.
 *
 * `OPENROUTER_API_KEY` is optional here so that commands which never call the
 * API (`--dry-run`, `history`) work without it. `getOpenRouterAsync` asserts it
 * when a request is actually made.
 */
export const environment = arkenv(
	{
		"DARKROOM_MODEL?": isMaybeNonEmptyString,
		"DARKROOM_PREVIEW?": "'blocks' | 'kitty' | 'off' | undefined",
		NODE_ENV: "'development' | 'production' | 'test' = 'development'",
		"OPENROUTER_API_KEY?": type(/^sk-or-v1-[a-zA-Z0-9]{64}$/u).or(isUndefined),
	},
	{
		emptyAsUndefined: true,
		env,
		onUndeclaredKey: "delete",
	},
);

export type Environment = typeof environment;
