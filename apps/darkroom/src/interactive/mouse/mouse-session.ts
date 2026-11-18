import { writeOsc52 } from "@visulima/tui";

import { createNoticeStore } from "$interactive/components/notice-store";
import { theme } from "$interactive/components/theme";

import { measureElement } from "./mouse-context";
import { createMouseRegistry } from "./mouse-registry";
import { createScreenMirror } from "./screen-mirror";
import { createTerminalInput } from "./terminal-input";
import { createTextSelection } from "./text-selection";

import type { NoticeStore } from "$interactive/components/notice-store";

import type { ElementMouseRegistry } from "./mouse-context";
import type { PointerEvent } from "./mouse-input";

export interface MouseSession {
	/** Lets go of the terminal. */
	readonly dispose: () => void;
	/** Takes each pointer event from the renderer's `MouseProvider`. */
	readonly handlePointer: (event: PointerEvent) => void;
	/** Toasts from outside a screen, like copied text. */
	readonly notices: NoticeStore;
	readonly registry: ElementMouseRegistry;
	/** The terminal's input, for the renderer. */
	readonly stdin: NodeJS.ReadStream;
	/** The output for the renderer, mirrored so selection can read it back. */
	readonly stdout: NodeJS.WriteStream;
}

/**
 * Puts the app under the mouse: hover, clicks, and the wheel go to what is
 * under the pointer, and a drag selects text and copies it, as the terminal
 * would without mouse reporting. The renderer turns reporting on and reads
 * the reports; this decides what they do.
 *
 * @param input - The terminal's input.
 * @param output - The terminal's output.
 * @returns The streams and contexts for the app, and how to stop.
 */
export function createMouseSession(input: NodeJS.ReadStream, output: NodeJS.WriteStream): MouseSession {
	const notices = createNoticeStore();
	const registry = createMouseRegistry(measureElement);
	const mirror = createScreenMirror(output, Number.parseInt(theme.selection.slice(1), 16));
	const selection = createTextSelection(mirror, (text) => {
		writeOsc52(output, text);
		notices.reporter.reportSuccess("Copied to clipboard");
	});
	const terminalInput = createTerminalInput(input, output);

	mirror.onWrite(selection.repaint);

	return {
		dispose(): void {
			terminalInput.dispose();
			mirror.dispose();
		},
		handlePointer(event): void {
			if (selection.handle(event)) {
				registry.cancelPress();
			}

			registry.dispatch(event);
		},
		notices,
		registry,
		stdin: terminalInput.stream,
		stdout: mirror.stream,
	};
}
