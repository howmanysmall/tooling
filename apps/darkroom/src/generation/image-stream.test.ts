import { describe, it } from "vitest";

import { consumeImageStreamAsync, describeProgress } from "./image-stream";

import type { ImageStreamingResponseData } from "@openrouter/sdk/models";

import type { StreamProgress } from "./image-stream";

async function* toStreamAsync(
	events: ReadonlyArray<ImageStreamingResponseData>,
): AsyncGenerator<ImageStreamingResponseData> {
	for (const event of events) {
		yield event;
	}
}

function createCompletedEvent(b64Json: string, cost: number): ImageStreamingResponseData {
	return {
		b64Json,
		created: 0,
		mediaType: "image/png",
		type: "image_generation.completed",
		usage: { completionTokens: 0, cost, promptTokens: 0, totalTokens: 0 },
	};
}

const PARTIAL: ImageStreamingResponseData = {
	b64Json: "partial",
	partialImageIndex: 0,
	type: "image_generation.partial_image",
};

describe("consumeImageStreamAsync", () => {
	it("keeps completed images, sums their cost, and reports partial frames as progress", async ({ expect }) => {
		expect.assertions(2);

		const progress: Array<StreamProgress> = [];
		const result = await consumeImageStreamAsync(
			toStreamAsync([PARTIAL, PARTIAL, createCompletedEvent("one", 0.02), createCompletedEvent("two", 0.02)]),
			(update) => {
				progress.push(update);
			},
		);

		expect(result).toStrictEqual({
			cost: 0.04,
			images: [
				{ b64Json: "one", mediaType: "image/png" },
				{ b64Json: "two", mediaType: "image/png" },
			],
		});
		expect(progress.map((update) => describeProgress(update, 2))).toStrictEqual([
			"image 1/2 · partial 1",
			"image 1/2 · partial 2",
			"image 2/2",
			"image 2/2",
		]);
	});

	it("keeps finished images when the stream ends with an error", async ({ expect }) => {
		expect.assertions(1);

		const result = await consumeImageStreamAsync(
			toStreamAsync([createCompletedEvent("one", 0.02), { error: { message: "safety filter" }, type: "error" }]),
			() => undefined,
		);

		expect(result).toStrictEqual({
			cost: 0.02,
			error: "safety filter",
			images: [{ b64Json: "one", mediaType: "image/png" }],
		});
	});

	it("ignores events it does not know", async ({ expect }) => {
		expect.assertions(1);

		const unknown: ImageStreamingResponseData = { isUnknown: true, raw: {}, type: "UNKNOWN" };
		const result = await consumeImageStreamAsync(toStreamAsync([unknown]), () => undefined);

		expect(result).toStrictEqual({ cost: undefined, images: [] });
	});

	it("shows the provider phase until partial frames arrive", ({ expect }) => {
		expect.assertions(1);

		expect(describeProgress({ completed: 0, partials: 0, phase: "reasoning" }, 1)).toBe("image 1/1 · reasoning…");
	});
});
