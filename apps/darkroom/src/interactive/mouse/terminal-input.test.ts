import { EventEmitter } from "node:events";
import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { createTerminalInput } from "./terminal-input";

import type { TestContext } from "vitest";

import type { TerminalInput } from "./terminal-input";

const QUERY_KEYBOARD = "\u001B[?u";
const KEYBOARD_REPLY = "\u001B[?0u";
const ENABLE_KEYBOARD = "\u001B[>1u";
const DISABLE_KEYBOARD = "\u001B[<u";

interface Terminal {
	readonly input: TerminalInput;
	/** Takes whatever has reached the renderer's stream so far. */
	readonly read: () => string;
	/** Types into the terminal, as its input stream would deliver it. */
	readonly send: (text: string) => void;
	/** How many times a sequence has been written to the terminal. */
	readonly writesOf: (sequence: string) => number;
}

/**
 * Opens the input on a fake terminal that records what is written to it.
 *
 * @param onTestFinished - Disposes the input after the test.
 * @returns How to drive the terminal and read what the renderer gets.
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

	const input = createTerminalInput(source, output);
	onTestFinished(input.dispose);

	return {
		input,
		read: (): string => String(input.stream.read() ?? ""),
		send(text): void {
			emitter.emit("data", Buffer.from(text));
		},
		writesOf: (sequence) => written.join("").split(sequence).length - 1,
	};
}

describe("createTerminalInput", () => {
	it("passes keys and whole mouse reports to the renderer", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { read, send } = openTerminal(onTestFinished);

		send("a\u001B[<0;3;2Mb");

		expect(read()).toBe("a\u001B[<0;3;2Mb");
	});

	it("holds a report cut off between reads until its other half comes, so none of it is typed", ({
		expect,
		onTestFinished,
	}) => {
		expect.assertions(2);

		const { read, send } = openTerminal(onTestFinished);

		send("x\u001B[<35;1");

		expect(read()).toBe("x");

		send("1;3M");

		expect(read()).toBe("\u001B[<35;11;3M");
	});

	it("makes ctrl+backspace delete a word", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { read, send } = openTerminal(onTestFinished);

		send("\b");

		expect(read()).toBe("\u0017");
	});

	it("asks the terminal about its keyboard once raw mode is on, and only once", ({ expect, onTestFinished }) => {
		expect.assertions(3);

		const { input, writesOf } = openTerminal(onTestFinished);

		expect(writesOf(QUERY_KEYBOARD)).toBe(0);

		input.stream.setRawMode(true);

		expect(writesOf(QUERY_KEYBOARD)).toBe(1);

		input.stream.setRawMode(false);
		input.stream.setRawMode(true);

		expect(writesOf(QUERY_KEYBOARD)).toBe(1);
	});

	it("turns the protocol on once when the terminal answers, and never types the answer", ({
		expect,
		onTestFinished,
	}) => {
		expect.assertions(2);

		const { input, read, send, writesOf } = openTerminal(onTestFinished);
		input.stream.setRawMode(true);

		send(KEYBOARD_REPLY);
		send(KEYBOARD_REPLY);

		expect(writesOf(ENABLE_KEYBOARD)).toBe(1);
		expect(read()).toBe("");
	});

	it("leaves the protocol alone on a terminal that doesn't answer", ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { input, send, writesOf } = openTerminal(onTestFinished);
		input.stream.setRawMode(true);

		send("a");
		input.dispose();

		expect(writesOf(ENABLE_KEYBOARD)).toBe(0);
		expect(writesOf(DISABLE_KEYBOARD)).toBe(0);
	});

	it("turns the protocol back off when disposed, so the shell gets normal keys", ({ expect, onTestFinished }) => {
		expect.assertions(1);

		const { input, send, writesOf } = openTerminal(onTestFinished);
		input.stream.setRawMode(true);

		send(KEYBOARD_REPLY);
		input.dispose();

		expect(writesOf(DISABLE_KEYBOARD)).toBe(1);
	});
});
