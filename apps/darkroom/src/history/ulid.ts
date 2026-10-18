import { getRandomValues } from "node:crypto";

/** Crockford's base32, as used by ULID. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/u;

function encodeTime(milliseconds: number): string {
	let remaining = milliseconds;
	let encoded = "";
	for (let index = 0; index < TIME_LENGTH; index += 1) {
		encoded = ALPHABET[remaining % 32] + encoded;
		remaining = Math.floor(remaining / 32);
	}
	return encoded;
}

function encodeRandom(): string {
	const bytes = getRandomValues(new Uint8Array(RANDOM_LENGTH));
	let encoded = "";
	for (const byte of bytes) encoded += ALPHABET[byte % 32];
	return encoded;
}

/**
 * Creates a ULID: 26 characters that sort by creation time.
 *
 * @param milliseconds - The creation time, in Unix milliseconds.
 * @returns A 26-character identifier that sorts by time.
 */
export function createUlid(milliseconds: number = Date.now()): string {
	return encodeTime(milliseconds) + encodeRandom();
}

export function isUlid(value: string): boolean {
	return ULID_PATTERN.test(value);
}
