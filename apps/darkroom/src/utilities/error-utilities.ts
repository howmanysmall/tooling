import { isString } from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

const isErrnoException = type({ code: isString }).readonly();

/**
 * Gets the Node.js error code, such as `EEXIST`, from a caught error.
 *
 * @param error - The caught error.
 * @returns The code, or `undefined` when the error has none.
 */
export function getErrorCode(error: Error): string | undefined {
	return isErrnoException.allows(error) ? error.code : undefined;
}
