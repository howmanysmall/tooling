import { createNoticeStore } from "$interactive/components/notice-store";
import { theme } from "$interactive/components/theme";
import { formatClipboardSequence } from "$interactive/keys/browser-keys";

import { measureElement } from "./mouse-context";
import { createMouseRegistry } from "./mouse-registry";
import { createMouseStdin } from "./mouse-stdin";
import { createScreenMirror } from "./screen-mirror";
import { createTextSelection } from "./text-selection";

import type { NoticeStore } from "$interactive/components/notice-store";

import type { InkMouseRegistry } from "./mouse-context";

export interface MouseSession {
	/** Turns mouse reporting off and lets go of the terminal. */
	readonly dispose: () => void;
	/** Toasts from outside a screen, like copied text. */
	readonly notices: NoticeStore;
	readonly registry: InkMouseRegistry;
	/** The keyboard input alone, for Ink. */
	readonly stdin: NodeJS.ReadStream;
	/** The output for Ink, mirrored so selected text can be read back. */
	readonly stdout: NodeJS.WriteStream;
}

/**
 * Puts the app under the mouse: hover, clicks, and the wheel go to what is
 * under the pointer, and a drag selects text and copies it, as the terminal
 * would without mouse reporting.
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
		output.write(formatClipboardSequence(text));
		notices.reporter.reportSuccess("Copied to clipboard");
	});

	mirror.onWrite(selection.repaint);

	const mouse = createMouseStdin(input, output, (event) => {
		if (selection.handle(event)) {
			registry.cancelPress();
		}

		registry.dispatch(event);
	});

	return {
		dispose(): void {
			mouse.dispose();
			mirror.dispose();
		},
		notices,
		registry,
		stdin: mouse.stream,
		stdout: mirror.stream,
	};
}
