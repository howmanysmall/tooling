import { describe, it } from "vitest";

import { fitImageToCells } from "./cell-fit";

describe("fitImageToCells", () => {
	it("fills the height for a square image in a wide box, two rows per column pair", ({ expect }) => {
		expect.assertions(1);

		expect(fitImageToCells(1024, 1024, { columns: 80, rows: 10 })).toStrictEqual({ columns: 20, rows: 10 });
	});

	it("fills the width for a wide image in a narrow box", ({ expect }) => {
		expect.assertions(1);

		expect(fitImageToCells(1920, 1080, { columns: 32, rows: 20 })).toStrictEqual({ columns: 32, rows: 9 });
	});

	it("never uses fewer than one cell", ({ expect }) => {
		expect.assertions(1);

		expect(fitImageToCells(4000, 10, { columns: 10, rows: 10 })).toStrictEqual({ columns: 10, rows: 1 });
	});
});
