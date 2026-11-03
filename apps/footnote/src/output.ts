import { stderr, stdout } from "node:process";
import { styleText } from "node:util";

type Format = Parameters<typeof styleText>[0];

// `styleText` checks the stream it is given, so a pipe and NO_COLOR both get
// plain text, and stdout and stderr decide separately.

/**
 * Styles text bound for stdout.
 *
 * @param format - The style to apply.
 * @param text - The text to style.
 * @returns The text, styled when stdout should get color.
 */
export function formatForStdout(format: Format, text: string): string {
	return styleText(format, text, { stream: stdout });
}

function writeStatus(format: Format, icon: string, message: string): void {
	stderr.write(`${styleText(format, icon, { stream: stderr })} ${message}\n`);
}

/**
 * Writes a success line to stderr.
 *
 * @param message - The message to write.
 */
export function writeSuccess(message: string): void {
	writeStatus("green", "✔", message);
}

/**
 * Writes a failure line to stderr.
 *
 * @param message - The message to write.
 */
export function writeFailure(message: string): void {
	writeStatus("red", "✖", message);
}

/**
 * Writes a warning line to stderr.
 *
 * @param message - The message to write.
 */
export function writeWarning(message: string): void {
	writeStatus("yellow", "⚠", `warning: ${message}`);
}

/**
 * Writes a dimmed line to stderr, for detail under a status line.
 *
 * @param message - The message to write.
 */
export function writeDetail(message: string): void {
	stderr.write(`${styleText("dim", message, { stream: stderr })}\n`);
}
