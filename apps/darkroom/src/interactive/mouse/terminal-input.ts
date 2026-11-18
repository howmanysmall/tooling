import process from "node:process";
import { PassThrough } from "node:stream";
import { StringDecoder } from "node:string_decoder";

import { holdBackPartialReport, normalizeCtrlBackspace, takeKeyboardReply } from "./mouse-input";

import type { Duplex } from "node:stream";

// The kitty keyboard protocol is how a terminal can report cmd+backspace at
// all. The renderer's own detection asks before raw mode is on, so a local
// terminal's instant answer lands in the line buffer and is lost.
const QUERY_KEYBOARD = "\u001B[?u";
const ENABLE_KEYBOARD = "\u001B[>1u";
const DISABLE_KEYBOARD = "\u001B[<u";

export interface TerminalInput {
	/** Lets go of the terminal's input, and its keyboard protocol. */
	readonly dispose: () => void;
	/** The terminal's input, cleaned up for the renderer. */
	readonly stream: NodeJS.ReadStream;
}

/**
 * Passes the terminal's input to the renderer, which reads the keys and
 * the mouse, with what it lacks: a mouse report cut off between reads
 * waits for its other half instead of being typed, `ctrl+backspace`
 * deletes a word, and the kitty keyboard protocol turns on once raw mode
 * is.
 *
 * @param source - The stream the terminal types into.
 * @param output - The terminal's output, to ask about the protocol.
 * @returns The cleaned-up input for the renderer, and how to stop.
 */
export function createTerminalInput(source: NodeJS.ReadStream, output: NodeJS.WriteStream): TerminalInput {
	// Typed as the shared base so a single assertion reaches `ReadStream`.
	const input: Duplex = new PassThrough({ encoding: "utf8" });
	const decoder = new StringDecoder("utf8");
	let pending = "";
	let hasAskedKeyboard = false;
	let isKeyboardEnhanced = false;

	/**
	 * Passes a chunk on, minus any report cut off at its end.
	 *
	 * @param chunk - Raw bytes; the input has no encoding set.
	 */
	function onData(chunk: Buffer): void {
		const held = holdBackPartialReport(pending + decoder.write(chunk));
		({ pending } = held);

		const { hasReply, text } = takeKeyboardReply(held.complete);
		if (hasReply && !isKeyboardEnhanced) {
			isKeyboardEnhanced = true;
			output.write(ENABLE_KEYBOARD);
		}

		if (text.length > 0) {
			input.write(normalizeCtrlBackspace(text));
		}
	}

	function disableKeyboard(): void {
		if (!isKeyboardEnhanced) return;
		isKeyboardEnhanced = false;
		output.write(DISABLE_KEYBOARD);
	}

	// The renderer drives raw mode and the event loop through these, as on
	// a TTY.
	Object.assign(input, {
		isTTY: true,
		ref(): Duplex {
			source.ref();
			return input;
		},
		setRawMode(mode: boolean): Duplex {
			source.setRawMode(mode);

			if (mode && !hasAskedKeyboard) {
				hasAskedKeyboard = true;
				output.write(QUERY_KEYBOARD);
			}

			return input;
		},
		unref(): Duplex {
			source.unref();
			return input;
		},
	});

	source.on("data", onData);
	// If darkroom dies with the app open, the shell must get normal keys.
	process.once("exit", disableKeyboard);

	return {
		dispose(): void {
			source.off("data", onData);
			source.pause();
			disableKeyboard();
			process.off("exit", disableKeyboard);
		},
		// SAFETY: it has every member the renderer uses on stdin, added above.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see the SAFETY comment
		stream: input as NodeJS.ReadStream,
	};
}
