import {
	isIsoDateString,
	isMaybeInteger,
	isMaybeNumber,
	isMaybeString,
	isNonNegativeInteger,
	isString,
} from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

const isStoredReference = type({
	/** The path or URL given with `-i`. */
	source: isString,
	/** The copy, relative to the history directory. */
	stored: isString,
}).readonly();

const isStoredImage = type({
	"mediaType?": isMaybeString,
	/** Where the image was written for the user, or `-` for stdout. */
	output: isString,
	/** The copy, relative to the history directory. */
	stored: isString,
}).readonly();

const isStoredRequest = type({
	"aspectRatio?": isMaybeString,
	"background?": isMaybeString,
	// oxlint-disable-next-line id-length -- the API calls this field n
	n: isNonNegativeInteger,
	"outputCompression?": isMaybeNumber,
	"outputFormat?": isMaybeString,
	"quality?": isMaybeString,
	"resolution?": isMaybeString,
	"seed?": isMaybeInteger,
}).readonly();

/** One line of `history.jsonl`: everything needed to show or repeat a run. */
export const isHistoryEntry = type({
	id: /^[0-9A-HJKMNP-TV-Z]{26}$/u,
	"+": "delete",
	/** The ULID shared by the runs of one `darkroom compare`. */
	"batch?": isMaybeString,
	"cost?": isMaybeNumber,
	created: isIsoDateString,
	/** Sessions forked from this run's session that keep this run. */
	"forks?": isString.array().readonly().or("undefined"),
	images: isStoredImage.array().readonly(),
	model: isString,
	"parent?": isMaybeString,
	prompt: isString,
	references: isStoredReference.array().readonly(),
	request: isStoredRequest,
	requested: isNonNegativeInteger,
	returned: isNonNegativeInteger,
	/** The ULID shared by the runs of one session in the app. */
	"session?": isMaybeString,
}).readonly();

export type HistoryEntry = typeof isHistoryEntry.infer;

export type StoredRequest = typeof isStoredRequest.infer;
