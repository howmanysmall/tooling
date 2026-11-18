/** What the pointer did. */
export const enum MouseAction {
	/** The pointer moved with the primary button held. */
	Drag = "drag",
	/** The pointer moved with no button held. */
	Move = "move",
	/** The primary button went down. */
	Press = "press",
	/** The primary button came up. */
	Release = "release",
	WheelDown = "wheel-down",
	WheelUp = "wheel-up",
}

/** A pointer event, in zero-based terminal cells. */
export interface PointerEvent {
	readonly action: MouseAction;
	readonly column: number;
	readonly row: number;
}

/** A chunk of terminal input, split where a report was cut off. */
export interface HeldInput {
	/** Everything up to the cut, for the renderer. */
	readonly complete: string;
	/** A report cut off at the chunk's end, kept for the next chunk. */
	readonly pending: string;
}

// A mouse report or a keyboard reply, cut off at the chunk's end.
// oxlint-disable-next-line no-control-regex -- the reports start with ESC
const PARTIAL_REPORT = /\u001B\[(?:<[\d;]*|\?\d*)$/u;

// The terminal's answer when asked for its keyboard protocol flags.
// oxlint-disable-next-line no-control-regex -- the reply starts with ESC
const KEYBOARD_REPLY = /\u001B\[\?\d+u/gu;

// oxlint-disable-next-line no-control-regex -- the point; ESC+BS stays alt+backspace
const LEGACY_CTRL_BACKSPACE = /(?<!\u001B)\u0008/gu;
const CTRL_W = "\u0017";

/** Input with the terminal's keyboard protocol answer taken out. */
export interface KeyboardReplySplit {
	/** The terminal answered, so it speaks the kitty keyboard protocol. */
	readonly hasReply: boolean;
	readonly text: string;
}

/**
 * Takes the terminal's answer to the keyboard protocol query out of the
 * input, so it never reaches a key handler as typing.
 *
 * @param text - Terminal input.
 * @returns Whether the terminal answered, and the rest of the input.
 */
export function takeKeyboardReply(text: string): KeyboardReplySplit {
	const rest = text.replaceAll(KEYBOARD_REPLY, "");
	return { hasReply: rest.length !== text.length, text: rest };
}

/**
 * Holds back a mouse report or keyboard reply cut off at the end of a
 * chunk. The renderer reads each chunk on its own, so the second half of a
 * cut report would reach a key handler as typing, like `1;3M`. A lone Esc
 * is not held, so the Esc key still works at once.
 *
 * @param chunk - What the terminal sent, after anything held back.
 * @returns The input to pass on, and the cut-off report.
 */
export function holdBackPartialReport(chunk: string): HeldInput {
	const partial = PARTIAL_REPORT.exec(chunk);
	if (partial === null) {
		return { complete: chunk, pending: "" };
	}

	return { complete: chunk.slice(0, partial.index), pending: partial[0] };
}

/**
 * Turns the `BS` byte into `ctrl+w`. Mac terminals send `DEL` for backspace,
 * so a `BS` is `ctrl+backspace`, which the renderer reports as a plain
 * backspace. That gives up `ctrl+h` as a backspace, which no key in the app
 * relies on.
 *
 * @param text - Terminal input.
 * @returns The input, with `ctrl+backspace` deleting a word.
 */
export function normalizeCtrlBackspace(text: string): string {
	// eslint-disable-next-line unicorn/no-unsafe-string-replacement -- think this is fine mate
	return text.replaceAll(LEGACY_CTRL_BACKSPACE, CTRL_W);
}
