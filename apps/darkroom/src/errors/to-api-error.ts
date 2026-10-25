import { isString } from "@howmanysmall/arktype-utilities";
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

const isErrorBody = type({
	error: { message: isString },
}).readonly();

/** Status codes where the provider may already have billed an image. */
const AMBIGUOUS_STATUS_CODES = new Set([500, 502, 524, 529]);

/** The JSON a provider sends back, where it may say what went wrong. */
const isProviderBody = type({
	"details?": { "error?": isString, "message?": isString },
	"error?": type(isString).or({ message: isString }),
	"message?": isString,
}).readonly();

function findReason({ details, error, message }: typeof isProviderBody.infer): string | undefined {
	const nested = isString.allows(error) ? error : error?.message;
	return details?.error ?? details?.message ?? nested ?? message;
}

/**
 * Shortens a provider's message that ends in the JSON it got back, like
 * `poll returned 500: {"id":…,"details":{"error":"Server side error"}}`, to
 * the reason inside it.
 *
 * @param message - OpenRouter's message.
 * @returns The message with the JSON replaced by its reason, or as it was.
 */
export function describeProviderMessage(message: string): string {
	const start = message.indexOf("{");
	if (start === -1) return message;

	try {
		const body = isProviderBody(JSON.parse(message.slice(start)));
		const reason = body instanceof type.errors ? undefined : findReason(body);
		return reason === undefined ? message : `${message.slice(0, start).trimEnd()} ${reason}`;
	} catch {
		return message;
	}
}

function getResponseMessage(error: OpenRouterError): string {
	try {
		const body = JSON.parse(error.body);
		if (isErrorBody.allows(body)) return describeProviderMessage(body.error.message);
	} catch {
		// The body was not JSON; fall back to its text.
	}

	const text = error.body.trim();
	return text.length === 0 ? `HTTP ${error.statusCode}` : text;
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
