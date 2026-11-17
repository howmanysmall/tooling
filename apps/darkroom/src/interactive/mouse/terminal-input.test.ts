import { EventEmitter } from "node:events";
import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { MouseAction } from "./mouse-input";
import { createMouseStdin } from "./mouse-stdin";

import type { TestContext } from "vitest";

import type { PointerEvent } from "./mouse-input";
import type { MouseStdin } from "./mouse-stdin";

const QUERY_KEYBOARD = "\u001B[?u";
const KEYBOARD_REPLY = "\u001B[?0u";
const ENABLE_KEYBOARD = "\u001B[>1u";
const DISABLE_KEYBOARD = "\u001B[<u";

interface Terminal {
	readonly pointerEvents: ReadonlyArray<PointerEvent>;
	/** Takes whatever has reached the keyboard stream so far. */
	readonly readKeyboard: () => string;
	/** Types into the terminal, as its input stream would deliver it. */
	readonly send: (text: string) => void;
	readonly stdin: MouseStdin;
	/** How many times a sequence has been written to the terminal. */
	readonly writesOf: (sequence: string) => number;
}

/**
 * Opens the input on a fake terminal that records what is written to it.
 *
 * @param onTestFinished - Disposes the input after the test.
 * @returns The input, and how to drive and read the terminal.
 */
function openTerminal(onTestFinished: TestContext["onTestFinished"]): Terminal {
	const emitter = new EventEmitter();
	const source = fromPartial<NodeJS.ReadStream>({
		off: (event: string, listener: (chunk: Buffer) => void) => emitter.off(event, listener),
		on: (event: string, listener: (chunk: Buffer) => void) => emitter.on(event, listener),
		pause: () => source,
		setRawMode: () => source,
	});

	const written: Array<string> = [];
	const output = fromPartial<NodeJS.WriteStream>({
		write(chunk: string): boolean {
			written.push(chunk);
			return true;
		},
	});

	const pointerEvents: Array<PointerEvent> = [];
	const stdin = createMouseStdin(source, output, (event) => {
		pointerEvents.push(event);
	});

	onTestFinished(stdin.dispose);

	return {
		pointerEvents,
		readKeyboard(): string {
			return String(stdin.stream.read() ?? "");
		},
		send(text): void {
			emitter.emit("data", Buffer.from(text));
		},
		stdin,
		writesOf: (sequence) => written.join("").split(sequence).length - 1,
	};
}

describe("createMouseStdin", () => {
	it("asks the terminal about its keyboard once, however often raw mode is set", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const { stdin, writesOf } = openTerminal(onTestFinished);

		expect(writesOf(QUERY_KEYBOARD)).toBe(0);

		stdin.stream.setRawMode(true);

		expect(writesOf(QUERY_KEYBOARD)).toBe(1);

		stdin.stream.setRawMode(false);
		stdin.stream.setRawMode(true);

		expect(writesOf(QUERY_KEYBOARD)).toBe(1);
	});

	it("turns the protocol on once when the terminal answers, and never types the answer", ({
		expect,
		onTestFinished,
	}) => {
		expect.assertions(2);

		const { readKeyboard, send, stdin, writesOf } = openTerminal(onTestFinished);
		stdin.stream.setRawMode(true);

		send(KEYBOARD_REPLY);
		send(KEYBOARD_REPLY);

		expect(writesOf(ENABLE_KEYBOARD)).toBe(1);
		expect(readKeyboard()).toBe("");
	});

	it("leaves the protocol alone on a terminal that doesn't answer", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { send, stdin, writesOf } = openTerminal(onTestFinished);
		stdin.stream.setRawMode(true);

		send("a");
		stdin.dispose();

		expect(writesOf(ENABLE_KEYBOARD)).toBe(0);
		expect(writesOf(DISABLE_KEYBOARD)).toBe(0);
	});

	it("turns the protocol back off when disposed, so the shell gets normal keys", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { send, stdin, writesOf } = openTerminal(onTestFinished);
		stdin.stream.setRawMode(true);

		send(KEYBOARD_REPLY);
		stdin.dispose();

		expect(writesOf(DISABLE_KEYBOARD)).toBe(1);
	});

	it("sends mouse reports to the pointer, and never types them", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { pointerEvents, readKeyboard, send } = openTerminal(onTestFinished);

		send("\u001B[<0;3;2M");

		expect(pointerEvents).toStrictEqual([{ action: MouseAction.Press, column: 2, row: 1 }]);
		expect(readKeyboard()).toBe("");
	});

	it("types what surrounds a mouse report", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { readKeyboard, send } = openTerminal(onTestFinished);

		send("a\u001B[<35;1;1Mb");

		expect(readKeyboard()).toBe("ab");
	});

	it("makes ctrl+backspace delete a word", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { readKeyboard, send } = openTerminal(onTestFinished);

		send("\b");

		expect(readKeyboard()).toBe("\u0017");
	});
});
