import type { CapabilityDescriptor, ImageModelListItem } from "@openrouter/sdk/models";

/**
 * Builds an image model for tests.
 *
 * @param id - An `author/slug` identifier.
 * @param supportedParameters - The parameters it declares.
 * @returns A model list item.
 */
export function createModel(
	id: string,
	supportedParameters: Readonly<Record<string, CapabilityDescriptor>>,
): ImageModelListItem {
	return {
		id,
		name: id,
		architecture: { inputModalities: ["text", "image"], outputModalities: ["image"] },
		created: 1_791_232_017,
		description: `${id} for tests.`,
		endpoints: `/images/models/${id}/endpoints`,
		supportedParameters,
		supportsStreaming: false,
	};
}

/** Like gpt-image: up to 10 images, 16 references, quality and background. */
export const MULTI_MODEL = createModel("test/multi", {
	aspect_ratio: { type: "enum", values: ["1:1", "16:9", "auto"] },
	background: { type: "enum", values: ["auto", "transparent", "opaque"] },
	input_references: { max: 16, min: 0, type: "range" },
	// oxlint-disable-next-line id-length -- the API calls this parameter n
	n: { max: 10, min: 1, type: "range" },
	output_compression: { max: 100, min: 0, type: "range" },
	output_format: { type: "enum", values: ["png", "jpeg", "webp"] },
	quality: { type: "enum", values: ["low", "medium", "high"] },
});

/** A text-only model that declares nothing beyond aspect ratios. */
export const SINGLE_MODEL = createModel("test/single", {
	aspect_ratio: { type: "enum", values: ["1:1"] },
});
