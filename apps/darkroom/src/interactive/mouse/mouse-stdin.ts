import process from "node:process";
import { PassThrough } from "node:stream";
import { StringDecoder } from "node:string_decoder";

import { splitMouseInput } from "./mouse-input";

import type { Duplex } from "node:stream";

import type { PointerEvent } from "./mouse-input";

// Report presses, every movement, and the wheel, in SGR form.
const ENABLE_MOUSE = "\u001B[?1000h\u001B[?1003h\u001B[?1006h";
const DISABLE_MOUSE = "\u001B[?1006l\u001B[?1003l\u001B[?1000l";

export interface MouseStdin {
	/** Stops reporting the mouse and lets go of the terminal's input. */
	readonly dispose: () => void;
	/** The keyboard input alone, for Ink. */
	readonly stream: NodeJS.ReadStream;
}

/**
 * Turns on mouse reporting and splits the terminal's input: pointer events
 * go to `onPointer`, and everything else to a stream for Ink, so a mouse
 * report never reaches a key handler or a text input as typing.
 *
 * @param source - The terminal's input.
 * @param output - The terminal's output, to turn reporting on and off.
 * @param onPointer - Receives each pointer event.
 * @returns The keyboard stream for Ink, and how to stop.
 */
export function createMouseStdin(
	source: NodeJS.ReadStream,
	output: NodeJS.WriteStream,
	onPointer: (event: PointerEvent) => void,
): MouseStdin {
	// Typed as the shared base so a single assertion reaches `ReadStream`.
	const keyboard: Duplex = new PassThrough({ encoding: "utf8" });
	const decoder = new StringDecoder("utf8");
	let pending = "";

	/**
	 * Splits a chunk of the terminal's input into keys and pointer events.
	 *
	 * @param chunk - Raw bytes; the input has no encoding set.
	 */
	function onData(chunk: Buffer): void {
		const split = splitMouseInput(pending + decoder.write(chunk));
		const { events, text } = split;
		({ pending } = split);
		if (text.length > 0) keyboard.write(text);
		for (const event of events) onPointer(event);
	}

	function disableMouse(): void {
		output.write(DISABLE_MOUSE);
	}

	// Ink drives raw mode and the event loop through these, as on a TTY.
	Object.assign(keyboard, {
		isTTY: true,
		ref(): Duplex {
			source.ref();
			return keyboard;
		},
		setRawMode(mode: boolean): Duplex {
			source.setRawMode(mode);
			return keyboard;
		},
		unref(): Duplex {
			source.unref();
			return keyboard;
		},
	});

	source.on("data", onData);
	output.write(ENABLE_MOUSE);
	// If darkroom dies with the app open, the shell must not keep getting
	// reports.
	process.once("exit", disableMouse);

	return {
		dispose(): void {
			source.off("data", onData);
			source.pause();
			disableMouse();
			process.off("exit", disableMouse);
		},
		// SAFETY: the stream has every member Ink uses on stdin, added above.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- see the SAFETY comment
		stream: keyboard as NodeJS.ReadStream,
	};
}
