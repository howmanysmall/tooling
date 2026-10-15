import { CliError } from "@howmanysmall/cli-utilities/cli-error";
import {
	ConnectionError,
	HTTPClientError,
	OpenRouterError,
	RequestAbortedError,
	RequestTimeoutError,
} from "@openrouter/sdk/models/errors";
import { type } from "arktype";

import { ApiError } from "./api-error";
import { InterruptedError } from "./interrupted-error";

export const CHARGE_NOTE =
	"The request may still have been charged; check https://openrouter.ai/activity before retrying.";

const isErrorBody = type({ error: { message: "string" } });

/** Status codes where the provider may already have billed an image. */
const AMBIGUOUS_STATUS_CODES = new Set([500, 502, 524, 529]);

function getResponseMessage(error: OpenRouterError): string {
	try {
		const body = JSON.parse(error.body);
		if (isErrorBody.allows(body)) return body.error.message;
	} catch {
		// The body was not JSON; fall back to its text.
	}
	const text = error.body.trim();
	return text === "" ? `HTTP ${error.statusCode}` : text;
}

function appendChargeNote(message: string, mayHaveCharged: boolean): string {
	return mayHaveCharged ? `${message} ${CHARGE_NOTE}` : message;
}

/**
 * Turns an error thrown by the OpenRouter SDK into a darkroom error with the
 * right exit code.
 *
 * @param error - What the SDK threw.
 * @param isPaidRequest - Whether the failed call could have been billed.
 *   Ambiguous failures of paid calls say they may have been charged.
 * @returns An error for `createBaseCommand` to print.
 */
export function toApiError(error: Error, isPaidRequest: boolean): CliError {
	if (error instanceof CliError) return error;

	if (error instanceof RequestAbortedError || error.name === "AbortError") {
		return new InterruptedError(appendChargeNote("Interrupted.", isPaidRequest), { cause: error });
	}

	if (error instanceof OpenRouterError) {
		const mayHaveCharged = isPaidRequest && AMBIGUOUS_STATUS_CODES.has(error.statusCode);
		const message = `OpenRouter returned ${error.statusCode}: ${getResponseMessage(error)}`;
		return new ApiError(appendChargeNote(message, mayHaveCharged), { cause: error });
	}

	if (error instanceof ConnectionError || error instanceof RequestTimeoutError) {
		return new ApiError(appendChargeNote(`Network error: ${error.message}`, isPaidRequest), { cause: error });
	}

	if (error instanceof HTTPClientError) return new ApiError(`Request failed: ${error.message}`, { cause: error });

	return new ApiError(error.message, { cause: error });
}
