import { describe, it } from "vitest";
import { fromPartial } from "@total-typescript/shoehorn";

import { createScreenMirror } from "./screen-mirror";

import type { TestContext } from "vitest";

import type { ScreenMirror } from "./screen-mirror";

const HIGHLIGHT = 0x5c_3a_2e;

// oxlint-disable-next-line no-control-regex -- strips the escape sequences
const ESCAPES = /\u001B(?:\[[\d;]*[A-Za-z]|[78])/gu;

interface Terminal {
	readonly mirror: ScreenMirror;
	/** Everything written to the terminal. */
	readonly written: Array<string>;
}

/**
 * Mirrors a fake 20×3 terminal that records what is written to it.
 *
 * @param onTestFinished - Disposes the mirror after the test.
 * @returns The mirror, and everything written to the terminal.
 */
function openTerminal(onTestFinished: TestContext["onTestFinished"]): Terminal {
	const written: Array<string> = [];
	const output = fromPartial<NodeJS.WriteStream>({
		columns: 20,
		off: () => output,
		on: () => output,
		rows: 3,
		write(chunk: string): boolean {
			written.push(chunk);
			return true;
		},
	});
	const mirror = createScreenMirror(output, HIGHLIGHT);
	onTestFinished(mirror.dispose);
	return { mirror, written };
}

async function drawAsync(mirror: ScreenMirror, text: string): Promise<void> {
	const { promise, resolve } = Promise.withResolvers<void>();
	mirror.onWrite(resolve);
	mirror.stream.write(text);
	await promise;
}

describe("createScreenMirror", () => {
	it("passes writes through and reads the text back from the cells", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { mirror, written } = openTerminal(onTestFinished);
		// Ink ends lines with a bare newline; the next starts at the left.
		await drawAsync(mirror, "\u001B[1mhello\u001B[0m world\nsecond line");

		expect(written).toStrictEqual(["\u001B[1mhello\u001B[0m world\nsecond line"]);
		expect(
			mirror.readText(
				mirror.findText([
					{ end: 20, row: 0, start: 6 },
					{ end: 6, row: 1, start: 0 },
				]),
			),
		).toBe("world\nsecond");
	});

	it("finds only the text, leaving out borders, images, and padding", async ({ expect, onTestFinished }) => {
		expect.assertions(2);

		const { mirror } = openTerminal(onTestFinished);
		await drawAsync(mirror, "┃ a cat  $1 ▀▄\n\nend");
		const runs = mirror.findText([
			{ end: 20, row: 0, start: 0 },
			{ end: 20, row: 1, start: 0 },
			{ end: 2, row: 2, start: 0 },
		]);

		expect(runs).toStrictEqual([
			{ end: 7, row: 0, start: 2 },
			{ end: 11, row: 0, start: 9 },
			{ end: 2, row: 2, start: 0 },
		]);
		expect(mirror.readText(runs)).toBe("a cat  $1\n\nen");
	});

	it("paints cells on the highlight, keeping their own style, and back again", async ({ expect, onTestFinished }) => {
		expect.assertions(4);

		const { mirror, written } = openTerminal(onTestFinished);
		await drawAsync(mirror, "\u001B[1;38;2;255;0;0mred\u001B[0m");
		written.length = 0;
		mirror.paint([{ end: 3, row: 0, start: 0 }], true);
		mirror.paint([{ end: 3, row: 0, start: 0 }], false);
		const [highlighted, restored] = written;

		expect(highlighted).toContain("\u001B[0;1;38;2;255;0;0;48;2;92;58;46mr");
		expect(highlighted?.replaceAll(ESCAPES, "")).toBe("red");
		expect(restored).toContain("\u001B[0;1;38;2;255;0;0;49mr");
		expect(restored?.startsWith("\u001B7\u001B[1;1H")).toBe(true);
	});
});
