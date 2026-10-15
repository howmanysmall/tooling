import { describe, it } from "vitest";

import { createUlid, isUlid } from "./ulid.ts";

describe("createUlid", () => {
	it("creates 26-character IDs that sort by time", ({ expect }) => {
		expect.assertions(3);

		const earlier = createUlid(1_791_232_017_000);
		const later = createUlid(1_791_232_017_001);

		expect(isUlid(earlier)).toBe(true);
		expect(earlier < later).toBe(true);
		expect(earlier.slice(0, 10)).toBe(createUlid(1_791_232_017_000).slice(0, 10));
	});

	it("rejects strings that are not ULIDs", ({ expect }) => {
		expect.assertions(2);

		expect(isUlid("01JA9XK2")).toBe(false);
		expect(isUlid("01JA9XK2ILOU0000000000000U")).toBe(false);
	});
});
