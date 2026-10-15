import { describe, it } from "vitest";

import { createEntry } from "$history/history-fixture";

import { ExampleSource, getModelExamples } from "./model-examples.ts";

describe("getModelExamples", () => {
	it("keeps each model's newest run that has an image", ({ expect }) => {
		expect.assertions(1);

		const runs = [
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA3", {
				created: "2026-10-14T10:00:00.000Z",
				images: [{ output: "-", stored: "images/newest/1.png" }],
				model: "google/banana",
				prompt: "newest",
			}),
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA1", {
				created: "2026-10-12T10:00:00.000Z",
				model: "google/banana",
				prompt: "oldest",
			}),
			createEntry("01M4YVAAAAAAAAAAAAAAAAAAA4", {
				created: "2026-10-15T10:00:00.000Z",
				images: [],
				model: "google/banana",
				prompt: "failed",
			}),
		];

		expect(getModelExamples(runs, (stored) => `/data/${stored}`).get("google/banana")).toStrictEqual({
			created: "2026-10-14T10:00:00.000Z",
			path: "/data/images/newest/1.png",
			prompt: "newest",
			source: ExampleSource.Yours,
		});
	});
});
