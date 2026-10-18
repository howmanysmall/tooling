import { describe, it } from "vitest";

import { formatKittyDelete, formatKittyPlaceholders, formatKittyTransmit } from "./kitty-graphics";

const ESC = "\u001B";

describe("formatKittyTransmit", () => {
	it("sends the image as a virtual placement in 4096-byte chunks", ({ expect }) => {
		expect.assertions(3);

		// 4000 bytes become 5336 base64 characters: two chunks.
		const commands = formatKittyTransmit(7, new Uint8Array(4000), { columns: 20, rows: 10 })
			.split(`${ESC}\\`)
			.filter((command) => command.length > 0);

		expect(commands).toHaveLength(2);
		expect(commands[0]?.split(";", 1)[0]).toBe(`${ESC}_Ga=T,f=100,t=d,U=1,q=2,i=7,c=20,r=10,m=1`);
		expect(commands[1]?.split(";", 1)[0]).toBe(`${ESC}_Gm=0`);
	});
});

describe("formatKittyPlaceholders", () => {
	it("colours each line with the image ID and marks every cell's row and column", ({ expect }) => {
		expect.assertions(2);

		const lines = formatKittyPlaceholders(0x01_02_03, { columns: 2, rows: 2 });

		expect(lines[0]).toBe(`${ESC}[38;2;1;2;3m\u{10EEEE}̅̅\u{10EEEE}̅̍${ESC}[39m`);
		expect(lines[1]).toBe(`${ESC}[38;2;1;2;3m\u{10EEEE}̍̅\u{10EEEE}̍̍${ESC}[39m`);
	});
});

describe("formatKittyDelete", () => {
	it("frees the image by ID without a reply", ({ expect }) => {
		expect.assertions(1);

		expect(formatKittyDelete(7)).toBe(`${ESC}_Ga=d,d=I,q=2,i=7${ESC}\\`);
	});
});
