import { describe, it } from "vitest";
import {
	ConnectionError,
	InvalidRequestError,
	OpenRouterDefaultError,
	RequestAbortedError,
} from "@openrouter/sdk/models/errors";

import { ConfigurationError } from "./configuration-error.ts";
import { CHARGE_NOTE, toApiError } from "./to-api-error.ts";

function createHttpError(status: number, body: string): OpenRouterDefaultError {
	const response = new Response(body, { status });
	const request = new Request("https://openrouter.ai/api/v1/images");
	return new OpenRouterDefaultError(`HTTP ${status}`, { body, request, response });
}

describe("toApiError", () => {
	it("uses the message from the response body and exits 1", ({ expect }) => {
		expect.assertions(2);

		const error = toApiError(createHttpError(400, '{"error":{"message":"Prompt is empty"}}'), true);

		expect(error.message).toBe("OpenRouter returned 400: Prompt is empty");
		expect(error.exitCode).toBe(1);
	});

	it("warns about a possible charge for server errors on paid calls only", ({ expect }) => {
		expect.assertions(3);

		expect(toApiError(createHttpError(502, "bad gateway"), true).message).toBe(
			`OpenRouter returned 502: bad gateway ${CHARGE_NOTE}`,
		);
		expect(toApiError(createHttpError(502, "bad gateway"), false).message).not.toContain(CHARGE_NOTE);
		expect(toApiError(createHttpError(402, "no credits"), true).message).not.toContain(CHARGE_NOTE);
	});

	it("warns about a possible charge when the connection drops during a paid call", ({ expect }) => {
		expect.assertions(2);

		const error = toApiError(new ConnectionError("socket hang up"), true);

		expect(error.message).toBe(`Network error: socket hang up ${CHARGE_NOTE}`);
		expect(error.exitCode).toBe(1);
	});

	it("maps aborts to exit 130", ({ expect }) => {
		expect.assertions(2);

		expect(toApiError(new RequestAbortedError("aborted"), false).exitCode).toBe(130);
		expect(toApiError(new DOMException("aborted", "AbortError"), false).exitCode).toBe(130);
	});

	it("passes darkroom errors through and maps other client errors to exit 1", ({ expect }) => {
		expect.assertions(2);

		const configurationError = new ConfigurationError("OPENROUTER_API_KEY is not set.");

		expect(toApiError(configurationError, true)).toBe(configurationError);
		expect(toApiError(new InvalidRequestError("bad input"), true).message).toBe("Request failed: bad input");
	});
});
