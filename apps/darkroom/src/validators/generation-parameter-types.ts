import { EnumType, StringType } from "@cliffy/command";

import { IMAGE_TYPES } from "$generation/media-types";

/** `--type`: the encodings the API can return. */
export const imageTypeType = new EnumType(IMAGE_TYPES);

/**
 * `--background`, `--quality`, and `--resolution` are checked against the
 * chosen model rather than a fixed list, because models declare subsets.
 */
export const backgroundType = new StringType();
export const qualityType = new StringType();
export const resolutionType = new StringType();

export const BACKGROUNDS: ReadonlyArray<string> = ["auto", "opaque", "transparent"];
export const QUALITIES: ReadonlyArray<string> = ["auto", "low", "medium", "high", "xhigh", "max"];
export const RESOLUTIONS: ReadonlyArray<string> = ["512", "768", "1K", "1.5K", "2K", "4K"];
