import { homedir } from "node:os";
import nodePath from "node:path";
import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";

import { describeRunLine, getModelName, getRunLinks, getRunStats } from "./run-facts.ts";

const ENTRY = createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", {
	created: new Date(2026, 9, 15, 9, 41).toISOString(),
	images: [
		{
			mediaType: "image/png",
			output: nodePath.join(homedir(), "art", "cat_1.png"),
			stored: "images/01M4YVAAA/1.png",
		},
	],
	model: "openai/gpt-image-1",
	// oxlint-disable-next-line id-length -- the API calls this field n
	request: { aspectRatio: "16:9", n: 2, resolution: "2K" },
	requested: 2,
	returned: 1,
});
const NOW = new Date(2026, 9, 15, 12);

describe("getModelName", () => {
	it("drops the provider", ({ expect }) => {
		expect.assertions(1);

		expect(getModelName("recraft/recraft-v4.1-flash")).toBe("recraft-v4.1-flash");
	});
});

describe("describeRunLine", () => {
	it("shows the model, the time, and the cost", ({ expect }) => {
		expect.assertions(1);

		expect(describeRunLine(ENTRY)).toBe("gpt-image-1 · 09:41 · $0.04");
	});
});

describe("getRunStats", () => {
	it("summarizes the size and says when fewer images came back", ({ expect }) => {
		expect.assertions(1);

		expect(getRunStats(ENTRY, NOW)).toStrictEqual([
			{ label: "model", value: "gpt-image-1" },
			{ label: "made", value: "Today 09:41" },
			{ label: "size", value: "16:9 · 2K" },
			{ label: "images", value: "1 of 2" },
			{ label: "cost", value: "$0.04" },
		]);
	});
});

describe("getRunLinks", () => {
	it("lists the user's file under ~, the comparison, and the ID last", ({ expect }) => {
		expect.assertions(1);

		const other = createEntry("01M4YVBBBBBBBBBBBBBBBBBBBB", { model: "recraft/recraft-v4.1-flash" });

		expect(getRunLinks(ENTRY, { batch: [other], parents: [] }, (stored) => `/data/${stored}`)).toStrictEqual([
			{ label: "file", value: "~/art/cat_1.png" },
			{ label: "compared", value: "01M4YVBB · recraft-v4.1-flash" },
			{ isQuiet: true, label: "id", value: ENTRY.id },
		]);
	});

	it("shows the history copy when the image only went to stdout", ({ expect }) => {
		expect.assertions(1);

		const piped = { ...ENTRY, images: [{ output: "-", stored: "images/x/1.png" }] };

		expect(getRunLinks(piped, { batch: [], parents: [] }, (stored) => `/data/${stored}`)[0]).toStrictEqual({
			label: "file",
			value: "/data/images/x/1.png",
		});
	});
});
