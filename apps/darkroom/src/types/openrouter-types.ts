import {
	isArrayOfStrings,
	isBoolean,
	isNumber,
	isString,
	isUnixTimestamp,
	isUnknown,
} from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

import type { ImageInputModality, ImageOutputModality } from "@openrouter/sdk/models";

const isEnumCapability = type({
	"+": "delete",
	type: "'enum'",
	values: isArrayOfStrings,
});
const isBooleanCapability = type({
	"+": "delete",
	type: "'boolean'",
});
const isRangeCapability = type({
	"+": "delete",
	max: isNumber,
	min: isNumber,
	type: "'range'",
});
const isUnknownCapability = type({
	"+": "delete",
	isUnknown: "true",
	raw: isUnknown,
	type: "'UNKNOWN'",
});

export const isCapabilityDescriptor = isEnumCapability
	.or(isBooleanCapability)
	.or(isRangeCapability)
	.or(isUnknownCapability);

export const isImageInputModality = isString.as<ImageInputModality>();
export const isImageOutputModality = isString.as<ImageOutputModality>();

export const isImageModelArchitecture = type({
	"+": "delete",
	inputModalities: isImageInputModality.array(),
	outputModalities: isImageOutputModality.array(),
});

export const isImageModelListItem = type({
	id: isString,
	name: isString,
	"+": "delete",
	architecture: isImageModelArchitecture,
	created: isUnixTimestamp,
	description: isString,
	endpoints: isString,
	supportedParameters: type.Record(isString, isCapabilityDescriptor),
	supportsStreaming: isBoolean,
});
