import { type } from "arktype";

const OPTIONAL_STRING = "string | undefined";

const isStoredReference = type({
	/** The path or URL given with `-i`. */
	source: "string",
	/** The copy, relative to the history directory. */
	stored: "string",
});

const isStoredImage = type({
	"mediaType?": OPTIONAL_STRING,
	/** Where the image was written for the user, or `-` for stdout. */
	output: "string",
	/** The copy, relative to the history directory. */
	stored: "string",
});

const isStoredRequest = type({
	"aspectRatio?": OPTIONAL_STRING,
	"background?": OPTIONAL_STRING,
	// oxlint-disable-next-line id-length -- the API calls this field n
	n: "number.integer >= 1",
	"outputCompression?": "number | undefined",
	"outputFormat?": OPTIONAL_STRING,
	"quality?": OPTIONAL_STRING,
	"resolution?": OPTIONAL_STRING,
	"seed?": "number.integer | undefined",
});

/** One line of `history.jsonl`: everything needed to show or repeat a run. */
export const isHistoryEntry = type({
	id: /^[0-9A-HJKMNP-TV-Z]{26}$/u,
	"+": "delete",
	/** The ULID shared by the runs of one `darkroom compare`. */
	"batch?": OPTIONAL_STRING,
	"cost?": "number | undefined",
	created: "string.date.iso",
	images: isStoredImage.array(),
	model: "string",
	"parent?": OPTIONAL_STRING,
	prompt: "string",
	references: isStoredReference.array(),
	request: isStoredRequest,
	requested: "number.integer >= 0",
	returned: "number.integer >= 0",
});

export type HistoryEntry = typeof isHistoryEntry.infer;
export type StoredRequest = typeof isStoredRequest.infer;
