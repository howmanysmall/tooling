import { EventEmitter } from "node:events";
import { fromPartial } from "@total-typescript/shoehorn";
import { render } from "ink";

import type { ReactElement } from "react";

/**
 * The width every screen test renders at: room for a list and a detail pane.
 */
export const TEST_COLUMNS = 100;

/**
 * The height every screen test renders at: a full detail pane plus the footer.
 */
export const TEST_ROWS = 24;

/**
 * A stdout that reports a fixed size. Ink asks the real terminal for any
 * dimension a stream leaves out, which made screen tests depend on the
 * window they ran in.
 */
class TestStdout extends EventEmitter {
	public readonly columns = TEST_COLUMNS;
	public readonly rows = TEST_ROWS;

	public lastFrame: string | undefined = undefined;
	public write = (frame: string): boolean => {
		this.lastFrame = frame;
		return true;
	};
}

export interface TestStdin {
	/** Hand Ink a key, as the terminal would. */
	readonly write: (data: string) => void;
}

function ignore(): void {
	// Ink calls the stream's lifecycle methods; a fake stream has nothing to do.
}

/**
 * A stdin that hands each written chunk to Ink as a key press.
 *
 * @returns The stream to render with, and to type into.
 */
function createStdin(): NodeJS.ReadStream & TestStdin {
	// Ink drains the stream with `read()` until it returns null, so this is
	// null rather than undefined between writes.
	// oxlint-disable-next-line unicorn/no-null -- Ink's drain loop stops on null, not undefined.
	let data: null | string = null;
	const stdin = new EventEmitter();
	return fromPartial<NodeJS.ReadStream & TestStdin>(
		Object.assign(stdin, {
			isTTY: true,
			pause: ignore,
			read: (): null | string => {
				const chunk = data;
				// oxlint-disable-next-line unicorn/no-null -- Ink's drain loop stops on null, not undefined.
				data = null;
				return chunk;
			},
			ref: ignore,
			resume: ignore,
			setEncoding: ignore,
			setRawMode: ignore,
			unref: ignore,
			write: (chunk: string): void => {
				data = chunk;
				stdin.emit("readable");
				stdin.emit("data", chunk);
			},
		}),
	);
}

export interface ScreenInstance {
	/** The most recent full frame Ink drew. */
	readonly lastFrame: () => string | undefined;
	/** Type into the screen. */
	readonly stdin: TestStdin;
	/** Unmount the tree and release Ink's hooks. */
	readonly unmount: () => void;
}

/**
 * Render a screen into a fixed {@link TEST_COLUMNS} by {@link TEST_ROWS}
 * terminal, so a frame looks the same on every machine.
 *
 * @param tree - The screen to render.
 * @returns The frame and stdin, like ink-testing-library's render.
 */
export function renderScreen(tree: ReactElement): ScreenInstance {
	const stdout = new TestStdout();
	const stdin = createStdin();
	const instance = render(tree, {
		debug: true,
		exitOnCtrlC: false,
		patchConsole: false,
		stderr: fromPartial<NodeJS.WriteStream>(new TestStdout()),
		stdin,
		stdout: fromPartial<NodeJS.WriteStream>(stdout),
	});

	return {
		lastFrame: (): string | undefined => stdout.lastFrame,
		stdin,
		unmount: (): void => {
			instance.unmount();
			instance.cleanup();
		},
	};
}
