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

/** A chunk of terminal input with the mouse reports taken out. */
export interface SplitInput {
	readonly events: ReadonlyArray<PointerEvent>;
	/** A mouse report cut off at the chunk's end, kept for the next chunk. */
	readonly pending: string;
	/** Everything else, for the keyboard. */
	readonly text: string;
}

// SGR mouse reports: ESC [ < button ; column ; row, then M (press or move)
// or m (release).
// oxlint-disable-next-line no-control-regex -- the reports start with ESC
const REPORT = /\u001B\[<(?<code>\d+);(?<column>\d+);(?<row>\d+)(?<final>[Mm])/gu;

// oxlint-disable-next-line no-control-regex -- the reports start with ESC
const PARTIAL_REPORT = /\u001B\[<[\d;]*$/u;

const MOTION_BIT = 32;
const WHEEL_BIT = 64;
const BUTTON_BITS = 3;
const PRIMARY_BUTTON = 0;

/**
 * Reads one SGR report's button code.
 *
 * @param code - The report's button number, with its modifier bits.
 * @param isRelease - Whether the report ended in `m`.
 * @returns The action, or `undefined` for the other buttons.
 */
export function toMouseAction(code: number, isRelease: boolean): MouseAction | undefined {
	if ((code & WHEEL_BIT) !== 0) return (code & 1) === 0 ? MouseAction.WheelUp : MouseAction.WheelDown;

	const isPrimary = (code & BUTTON_BITS) === PRIMARY_BUTTON;
	if ((code & MOTION_BIT) !== 0) return isPrimary ? MouseAction.Drag : MouseAction.Move;
	if (!isPrimary) return undefined;
	return isRelease ? MouseAction.Release : MouseAction.Press;
}

/**
 * Reads one report's captured fields.
 *
 * @param groups - The report's code, column, row, and final letter.
 * @returns The event in zero-based cells, or `undefined` for buttons
 *   darkroom doesn't use.
 */
function toPointerEvent(groups?: Record<string, string>): PointerEvent | undefined {
	const action = toMouseAction(Number(groups?.code), groups?.final === "m");
	if (action === undefined) return undefined;
	return { action, column: Number(groups?.column) - 1, row: Number(groups?.row) - 1 };
}

/**
 * Takes the mouse reports out of a chunk of terminal input, so the keyboard
 * never sees them. A report cut off at the end is held back for the next
 * chunk; a lone Esc is not, so the Esc key still works at once.
 *
 * @param chunk - What the terminal sent, after anything held back.
 * @returns The pointer events, the rest of the text, and any cut-off report.
 */
export function splitMouseInput(chunk: string): SplitInput {
	const partial = PARTIAL_REPORT.exec(chunk);
	const complete = partial === null ? chunk : chunk.slice(0, partial.index);
	const events: Array<PointerEvent> = [];
	for (const { groups } of complete.matchAll(REPORT)) {
		const event = toPointerEvent(groups);
		if (event !== undefined) {
			events.push(event);
		}
	}

	return { events, pending: partial?.[0] ?? "", text: complete.replaceAll(REPORT, "") };
}
