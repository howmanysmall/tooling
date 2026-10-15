import { describe, it } from "vitest";

import { OutputFormat } from "$validators/output-format-type";

import { formatHistoryEntry, formatHistoryList, previewPrompt } from "./format-history.ts";
import { createEntry } from "./history-fixture.ts";

const ENTRY = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", { prompt: "a cat in a hat" });
const PARENT = createEntry("01M4YVBBBBBBBBBBBBBBBBBBBB");

describe("formatHistoryList", () => {
	it("shows the short ID, model, cost, and prompt for each run", ({ expect }) => {
		expect.assertions(4);

		const text = formatHistoryList([ENTRY], OutputFormat.Pretty);

		expect(text).toContain("01M4YVAA");
		expect(text).toContain("openai/gpt-image-1");
		expect(text).toContain("$0.04");
		expect(text).toContain("a cat in a hat");
	});

	it("prints the entries themselves as JSON", ({ expect }) => {
		expect.assertions(1);

		expect(JSON.parse(formatHistoryList([ENTRY], OutputFormat.JsonMinified))).toStrictEqual([ENTRY]);
	});
});

describe("formatHistoryEntry", () => {
	it("includes the parent chain and resolved copies", ({ expect }) => {
		expect.assertions(2);

		const text = formatHistoryEntry(ENTRY, [PARENT], OutputFormat.Pretty, (stored) => `/data/${stored}`);

		expect(text).toContain("01M4YVBB");
		expect(text).toContain("/data/images/01M4YVAAAAAAAAAAAAAAAAAAA1/1.png");
	});

	it("adds the parent IDs to the JSON", ({ expect }) => {
		expect.assertions(1);

		const json = formatHistoryEntry(ENTRY, [PARENT], OutputFormat.JsonMinified, (stored) => stored);

		expect(JSON.parse(json)).toMatchObject({ id: ENTRY.id, parents: [PARENT.id] });
	});
});

describe("previewPrompt", () => {
	it("flattens and shortens long prompts", ({ expect }) => {
		expect.assertions(1);

		expect(previewPrompt("one\ntwo three four", 10)).toBe("one two t…");
	});
});
