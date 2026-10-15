import type { RetryConfig } from "@openrouter/sdk/lib/retries.js";

/**
 * Free, read-only calls such as listing models: retry 5XX and connection
 * errors, but give up within 30 seconds instead of the SDK's one hour.
 */
export const READ_ONLY_RETRIES: RetryConfig = {
	backoff: { exponent: 1.5, initialInterval: 500, maxElapsedTime: 30_000, maxInterval: 5000 },
	retryConnectionErrors: true,
	strategy: "backoff",
};
