import { env } from "node:process";
import { arkenv, type } from "@arkenv/core";

/**
 * Environment variable schema for server-side or runtime-only validation.
 */
export const environment = arkenv(
	{
		NODE_ENV: "'development' | 'production' | 'test' = 'development'",
		OPENROUTER_API_KEY: type(/^sk-or-v1-[a-zA-Z0-9]{64}$/u),
	},
	{
		emptyAsUndefined: true,
		env,
		onUndeclaredKey: "delete",
	},
);
export type Environment = typeof environment;
