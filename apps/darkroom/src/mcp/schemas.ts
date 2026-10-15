import { type } from "arktype";

import { IMAGE_TYPES } from "$generation/media-types";
import { ModelSort } from "$utilities/model-filters";

// Tool inputs. The adapter converts these with arktype's plain
// toJsonSchema(), so they stick to what JSON Schema can express: no narrow or
// morph. Descriptions double as arktype's "must be …" errors, so they read as
// noun phrases.

const text = type("string > 0");
const flag = type("boolean");

const imageSource = text.describe("a file path or an http(s) URL of a reference image");
const references = imageSource.array().describe("reference images");
const prompt = text.describe("the prompt");
const force = flag.describe("whether to overwrite an existing output file");

/** `-` writes images to stdout, which carries the MCP stream. */
const outputPath = type(/^(?!-$)./u).describe(
	"a file path, or a directory ending in / (not -, since stdout carries the MCP stream)",
);

const budgetFields = {
	"allowUnknownCost?": flag.describe("whether to send when the price can't be estimated"),
	"maxCost?": type("number > 0").describe("the most to spend in US dollars; a request estimated above it is refused"),
} as const;

const generationFields = {
	"aspectRatio?": text.describe("an aspect ratio the model supports, like 16:9"),
	"background?": text.describe("a background mode the model supports, like transparent"),
	"compression?": type("0 <= number.integer <= 100").describe("the jpeg or webp compression level"),
	"count?": type("1 <= number.integer <= 10").describe("how many images to request"),
	"quality?": text.describe("a quality level the model supports"),
	"resolution?": text.describe("a resolution tier the model supports, like 2k"),
	"seed?": type("number.integer").describe("a seed, for models that take one"),
	"type?": type.enumerated(...IMAGE_TYPES).describe("the image encoding"),
} as const;

export const listModelsInput = type({
	"multi?": flag.describe("whether to keep only models that return several images per request"),
	"provider?": text.describe("a provider prefix, like google"),
	"ratio?": text.describe("an aspect ratio every listed model must accept"),
	"refs?": flag.describe("whether to keep only models that accept reference images"),
	"search?": text.describe("a case-insensitive match on name, ID, and description"),
	"sort?": type.enumerated(ModelSort.Created, ModelSort.Name, ModelSort.Price).describe("the sort order"),
	"transparent?": flag.describe("whether to keep only models that can make a transparent background"),
});

export const getModelInput = type({
	model: text.describe("an OpenRouter model ID, like google/gemini-3-pro-image"),
});

export const estimateCostInput = type({
	...generationFields,
	"images?": references,
	models: text.array().atLeastLength(1).describe("one or more model IDs to price"),
	prompt,
});

export const generateImageInput = type({
	...budgetFields,
	...generationFields,
	"force?": force,
	"images?": references,
	"model?": text.describe("a model ID; defaults to DARKROOM_MODEL"),
	"output?": outputPath,
	prompt,
});

export const compareModelsInput = type({
	...budgetFields,
	...generationFields,
	"images?": references,
	models: text.array().atLeastLength(2).describe("two or more distinct model IDs"),
	"output?": outputPath,
	prompt,
});

export const listHistoryInput = type({
	"limit?": type("1 <= number.integer <= 500").describe("how many of the newest runs to return"),
});

const runReference = text.describe("a run ID or unique prefix, last, or last~N");

export const showRunInput = type({ run: runReference });

export const rerunInput = type({
	...budgetFields,
	...generationFields,
	"force?": force,
	"images?": imageSource.array().describe("reference images that replace the stored ones"),
	"model?": text.describe("a different model ID"),
	"output?": outputPath,
	run: runReference,
});
