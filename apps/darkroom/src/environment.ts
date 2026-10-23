import { env } from "node:process";
import { arkenv } from "@arkenv/core";
import { isMaybeNonEmptyString } from "@howmanysmall/arktype-utilities";

/**
 * Environment variable schema for darkroom's own settings.
 *
 * The OpenRouter key lives in `@howmanysmall/ai`, which asserts it when a
 * request is actually made, so commands which never call the API (`--dry-run`,
 * `history`) work without it.
 */
export const environment = arkenv(
	{
		"DARKROOM_MODEL?": isMaybeNonEmptyString,
		"DARKROOM_PREVIEW?": "'blocks' | 'kitty' | 'off' | undefined",
	},
	{
		emptyAsUndefined: true,
		env,
		onUndeclaredKey: "delete",
	},
);
