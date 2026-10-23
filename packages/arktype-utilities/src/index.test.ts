// biome-ignore-all lint/performance/useTopLevelRegex: this is a unit test sir
// biome-ignore-all lint/suspicious/noEmptyBlockStatements: this is a unit test sir
import { describe, expectTypeOf, it } from "vitest";

import {
	DELETE,
	IGNORE,
	isArrayBuffer,
	isArrayOfIntegers,
	isArrayOfNonEmptyStrings,
	isArrayOfNumbers,
	isArrayOfStrings,
	isArrayOfUnknowns,
	isBoolean,
	isDictionaryOfBooleans,
	isDictionaryOfIntegers,
	isDictionaryOfStrings,
	isDictionaryOfUnknowns,
	isEmailString,
	isEpoch,
	isFalse,
	isFunction,
	isInteger,
	isIsoDateString,
	isJsonObject,
	isMaybeBoolean,
	isMaybeInteger,
	isMaybeJsonObject,
	isMaybeNonEmptyString,
	isMaybeNonNegativeInteger,
	isMaybeNonNegativeNumber,
	isMaybeNull,
	isMaybeNumber,
	isMaybePositiveInteger,
	isMaybePositiveNumber,
	isMaybeReadonlyArrayOfStrings,
	isMaybeReadonlyDictionaryOfStrings,
	isMaybeString,
	isMaybeUrlString,
	isNever,
	isNonEmptyString,
	isNonNegativeInteger,
	isNonNegativeNumber,
	isNull,
	isNullableString,
	isNumber,
	isNumberOrStringToBoolean,
	isObject,
	isOptionalBoolean,
	isOptionalNonNegativeInteger,
	isOptionalNumber,
	isOptionalReadonlyArrayOfStrings,
	isOptionalReadonlyDictionaryOfStrings,
	isOptionalString,
	isOptionalUrlString,
	isPositiveInteger,
	isPositiveNumber,
	isReadonlyArrayOfNumbers,
	isReadonlyArrayOfStrings,
	isReadonlyArrayOfUnknowns,
	isReadonlyDictionaryOfStrings,
	isReadonlyDictionaryOfUnknowns,
	isSemverString,
	isString,
	isStringToNumber,
	isTrue,
	isUndefined,
	isUnixTimestamp,
	isUnknown,
	isUrlString,
	REJECT,
} from "./index";

import type { DictionaryOfUnknowns, MaybeReadonlyDictionaryOfStrings, UndeclaredKeyBehavior } from "./index";

describe("primitive validators", () => {
	it("isBoolean accepts booleans and rejects strings", ({ expect }) => {
		expect.assertions(2);

		expect(isBoolean.allows(true)).toBe(true);
		expect(isBoolean.allows("true")).toBe(false);
	});

	it("isTrue accepts true and rejects everything else", ({ expect }) => {
		expect.assertions(3);

		expect(isTrue.allows(true)).toBe(true);
		expect(isTrue.allows(false)).toBe(false);
		expect(isTrue.allows("true")).toBe(false);
	});

	it("isFalse accepts false and rejects everything else", ({ expect }) => {
		expect.assertions(3);

		expect(isFalse.allows(false)).toBe(true);
		expect(isFalse.allows(true)).toBe(false);
		expect(isFalse.allows("false")).toBe(false);
	});

	it("isNumber accepts numbers and rejects strings", ({ expect }) => {
		expect.assertions(2);

		expect(isNumber.allows(1)).toBe(true);
		expect(isNumber.allows("1")).toBe(false);
	});

	it("isString accepts strings and rejects numbers", ({ expect }) => {
		expect.assertions(2);

		expect(isString.allows("hi")).toBe(true);
		expect(isString.allows(1)).toBe(false);
	});

	it("isNonEmptyString accepts non-empty strings and rejects empty strings", ({ expect }) => {
		expect.assertions(3);

		expect(isNonEmptyString.allows("hi")).toBe(true);
		expect(isNonEmptyString.allows("")).toBe(false);
		expect(isNonEmptyString.allows(undefined)).toBe(false);
	});

	it("isUndefined accepts undefined and rejects null", ({ expect }) => {
		expect.assertions(2);

		expect(isUndefined.allows(undefined)).toBe(true);
		expect(isUndefined.allows(null)).toBe(false);
	});

	it("isNull accepts null and rejects undefined", ({ expect }) => {
		expect.assertions(2);

		expect(isNull.allows(null)).toBe(true);
		expect(isNull.allows(undefined)).toBe(false);
	});

	it("isUnknown accepts any value", ({ expect }) => {
		expect.assertions(3);

		expect(isUnknown.allows(1)).toBe(true);
		expect(isUnknown.allows(undefined)).toBe(true);
		expect(isUnknown.allows(null)).toBe(true);
	});
});

describe("integer validators", () => {
	it("isInteger accepts whole numbers and rejects fractional ones", ({ expect }) => {
		expect.assertions(4);

		expect(isInteger.allows(0)).toBe(true);
		expect(isInteger.allows(-42)).toBe(true);
		expect(isInteger.allows(1.5)).toBe(false);
		expect(isInteger.allows("1")).toBe(false);
	});

	// A Unix timestamp is an integer, so fractional milliseconds cannot pass.
	it("isUnixTimestamp accepts millisecond timestamps including zero and pre-epoch values", ({ expect }) => {
		expect.assertions(5);

		expect(isUnixTimestamp.allows(0)).toBe(true);
		expect(isUnixTimestamp.allows(1_704_067_200_000)).toBe(true);
		expect(isUnixTimestamp.allows(-1)).toBe(true);
		expect(isUnixTimestamp.allows(1.5)).toBe(false);
		expect(isUnixTimestamp.allows("1704067200000")).toBe(false);
	});

	it("isPositiveInteger rejects zero and negative integers", ({ expect }) => {
		expect.assertions(4);

		expect(isPositiveInteger.allows(1)).toBe(true);
		expect(isPositiveInteger.allows(1.5)).toBe(false);
		expect(isPositiveInteger.allows(0)).toBe(false);
		expect(isPositiveInteger.allows(-1)).toBe(false);
	});

	it("isNonNegativeInteger accepts zero but rejects negative integers", ({ expect }) => {
		expect.assertions(4);

		expect(isNonNegativeInteger.allows(0)).toBe(true);
		expect(isNonNegativeInteger.allows(1)).toBe(true);
		expect(isNonNegativeInteger.allows(1.5)).toBe(false);
		expect(isNonNegativeInteger.allows(-1)).toBe(false);
	});
});

describe("date validators", () => {
	// ISO 8601 wants a T before the time part, and 25:00 is not an hour.
	it("isIsoDateString accepts ISO 8601 dates and rejects other strings", ({ expect }) => {
		expect.assertions(5);

		expect(isIsoDateString.allows("2024-01-01T00:00:00Z")).toBe(true);
		expect(isIsoDateString.allows("2024-01-01T00:00:00.000Z")).toBe(true);
		expect(isIsoDateString.allows("2024-01-01T00:00:00+02:00")).toBe(true);
		expect(isIsoDateString.allows("2024-01-01 00:00:00Z")).toBe(false);
		expect(isIsoDateString.allows("2024-01-01T25:00:00Z")).toBe(false);
	});

	it("isIsoDateString rejects strings that are not dates at all", ({ expect }) => {
		expect.assertions(3);

		expect(isIsoDateString.allows("")).toBe(false);
		expect(isIsoDateString.allows("not-a-date")).toBe(false);
		expect(isIsoDateString.allows(1_704_067_200_000)).toBe(false);
	});
});

describe("json validators", () => {
	it("isJsonObject accepts objects and arrays holding nested JSON values", ({ expect }) => {
		expect.assertions(3);

		expect(isJsonObject.allows({})).toBe(true);
		expect(isJsonObject.allows({ a: 1, b: ["two", true, null, { count: 3 }] })).toBe(true);
		expect(isJsonObject.allows([1, "two", null])).toBe(true);
	});

	// `undefined` and `bigint` have no JSON representation, so they fail even
	// nested inside an object that is otherwise JSON.
	it("isJsonObject rejects values JSON cannot represent", ({ expect }) => {
		expect.assertions(5);

		expect(isJsonObject.allows({ a: undefined })).toBe(false);
		expect(isJsonObject.allows({ a: 1n })).toBe(false);
		expect(isJsonObject.allows(null)).toBe(false);
		expect(isJsonObject.allows("a")).toBe(false);
		expect(isJsonObject.allows(undefined)).toBe(false);
	});

	it("isMaybeJsonObject accepts a JSON object or undefined and rejects null", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeJsonObject.allows({ a: 1 })).toBe(true);
		expect(isMaybeJsonObject.allows(undefined)).toBe(true);
		expect(isMaybeJsonObject.allows({ a: undefined })).toBe(false);
		expect(isMaybeJsonObject.allows(null)).toBe(false);
	});
});

describe("optional and nullable validators", () => {
	it("isMaybeString accepts a string or undefined", ({ expect }) => {
		expect.assertions(3);

		expect(isMaybeString.allows("a")).toBe(true);
		expect(isMaybeString.allows(undefined)).toBe(true);
		expect(isMaybeString.allows(null)).toBe(false);
	});

	it("isNullableString accepts a string or null", ({ expect }) => {
		expect.assertions(3);

		expect(isNullableString.allows("a")).toBe(true);
		expect(isNullableString.allows(null)).toBe(true);
		expect(isNullableString.allows(undefined)).toBe(false);
	});

	it("isMaybeNumber accepts a number or undefined", ({ expect }) => {
		expect.assertions(3);

		expect(isMaybeNumber.allows(1)).toBe(true);
		expect(isMaybeNumber.allows(1.5)).toBe(true);
		expect(isMaybeNumber.allows(undefined)).toBe(true);
	});

	it("isMaybeInteger accepts an integer or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeInteger.allows(1)).toBe(true);
		expect(isMaybeInteger.allows(undefined)).toBe(true);
		expect(isMaybeInteger.allows(1.5)).toBe(false);
		expect(isMaybeInteger.allows(null)).toBe(false);
	});

	it("isMaybePositiveInteger accepts a positive integer or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybePositiveInteger.allows(1)).toBe(true);
		expect(isMaybePositiveInteger.allows(undefined)).toBe(true);
		expect(isMaybePositiveInteger.allows(0)).toBe(false);
		expect(isMaybePositiveInteger.allows(1.5)).toBe(false);
	});

	it("isMaybeNonNegativeInteger accepts a non-negative integer or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeNonNegativeInteger.allows(0)).toBe(true);
		expect(isMaybeNonNegativeInteger.allows(undefined)).toBe(true);
		expect(isMaybeNonNegativeInteger.allows(-1)).toBe(false);
		expect(isMaybeNonNegativeInteger.allows(1.5)).toBe(false);
	});

	it("isMaybeNonEmptyString accepts a non-empty string or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeNonEmptyString.allows("a")).toBe(true);
		expect(isMaybeNonEmptyString.allows(undefined)).toBe(true);
		expect(isMaybeNonEmptyString.allows("")).toBe(false);
		expect(isMaybeNonEmptyString.allows(null)).toBe(false);
	});

	it("isMaybeBoolean accepts a boolean or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeBoolean.allows(true)).toBe(true);
		expect(isMaybeBoolean.allows(false)).toBe(true);
		expect(isMaybeBoolean.allows(undefined)).toBe(true);
		expect(isMaybeBoolean.allows("true")).toBe(false);
	});

	it("isMaybeNull accepts null or undefined", ({ expect }) => {
		expect.assertions(2);

		expect(isMaybeNull.allows(null)).toBe(true);
		expect(isMaybeNull.allows(undefined)).toBe(true);
	});

	it("isMaybeReadonlyDictionaryOfStrings accepts accepts string records and rejects non-string records or undefined", ({
		expect,
	}) => {
		expect.assertions(4);

		expect(isMaybeReadonlyDictionaryOfStrings.allows({ a: "b" })).toBe(true);
		expect(isMaybeReadonlyDictionaryOfStrings.allows({ a: 1 })).toBe(false);
		expect(isMaybeReadonlyDictionaryOfStrings.allows(undefined)).toBe(true);
		expect(isMaybeReadonlyDictionaryOfStrings.allows(null)).toBe(false);
	});

	it("isOptionalBoolean accepts a boolean, null, or undefined", ({ expect }) => {
		expect.assertions(5);

		expect(isOptionalBoolean.allows(true)).toBe(true);
		expect(isOptionalBoolean.allows(false)).toBe(true);
		expect(isOptionalBoolean.allows(null)).toBe(true);
		expect(isOptionalBoolean.allows(undefined)).toBe(true);
		expect(isOptionalBoolean.allows("true")).toBe(false);
	});

	it("isOptionalNumber accepts a number, null, or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isOptionalNumber.allows(1)).toBe(true);
		expect(isOptionalNumber.allows(null)).toBe(true);
		expect(isOptionalNumber.allows(undefined)).toBe(true);
		expect(isOptionalNumber.allows("1")).toBe(false);
	});

	it("isOptionalString accepts a string, null, or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isOptionalString.allows("a")).toBe(true);
		expect(isOptionalString.allows(null)).toBe(true);
		expect(isOptionalString.allows(undefined)).toBe(true);
		expect(isOptionalString.allows(1)).toBe(false);
	});

	it("isOptionalReadonlyArrayOfStrings accepts a readonly string array, null, or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isOptionalReadonlyArrayOfStrings.allows(["a"])).toBe(true);
		expect(isOptionalReadonlyArrayOfStrings.allows(null)).toBe(true);
		expect(isOptionalReadonlyArrayOfStrings.allows(undefined)).toBe(true);
		expect(isOptionalReadonlyArrayOfStrings.allows([1])).toBe(false);
	});

	it("isOptionalNonNegativeInteger accepts a non-negative integer, null, or undefined", ({ expect }) => {
		expect.assertions(6);

		expect(isOptionalNonNegativeInteger.allows(0)).toBe(true);
		expect(isOptionalNonNegativeInteger.allows(1)).toBe(true);
		expect(isOptionalNonNegativeInteger.allows(null)).toBe(true);
		expect(isOptionalNonNegativeInteger.allows(undefined)).toBe(true);
		expect(isOptionalNonNegativeInteger.allows(-1)).toBe(false);
		expect(isOptionalNonNegativeInteger.allows(1.5)).toBe(false);
	});

	it("isOptionalUrlString accepts a URL string, null, or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isOptionalUrlString.allows("https://example.com")).toBe(true);
		expect(isOptionalUrlString.allows(null)).toBe(true);
		expect(isOptionalUrlString.allows(undefined)).toBe(true);
		expect(isOptionalUrlString.allows("not a url")).toBe(false);
	});

	it("isOptionalReadonlyDictionaryOfStrings accepts a readonly string record, null, or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isOptionalReadonlyDictionaryOfStrings.allows({ a: "b" })).toBe(true);
		expect(isOptionalReadonlyDictionaryOfStrings.allows(null)).toBe(true);
		expect(isOptionalReadonlyDictionaryOfStrings.allows(undefined)).toBe(true);
		expect(isOptionalReadonlyDictionaryOfStrings.allows({ a: 1 })).toBe(false);
	});
});

describe("array validators", () => {
	it("isArrayOfStrings accepts string arrays and rejects number arrays", ({ expect }) => {
		expect.assertions(2);

		expect(isArrayOfStrings.allows(["a"])).toBe(true);
		expect(isArrayOfStrings.allows([1])).toBe(false);
	});

	it("isReadonlyArrayOfStrings accepts string arrays and rejects number arrays", ({ expect }) => {
		expect.assertions(2);

		expect(isReadonlyArrayOfStrings.allows(["a"])).toBe(true);
		expect(isReadonlyArrayOfStrings.allows([1])).toBe(false);
	});

	it("isArrayOfNumbers accepts number arrays and rejects string arrays", ({ expect }) => {
		expect.assertions(2);

		expect(isArrayOfNumbers.allows([1])).toBe(true);
		expect(isArrayOfNumbers.allows(["a"])).toBe(false);
	});

	it("isReadonlyArrayOfNumbers accepts number arrays and rejects string arrays", ({ expect }) => {
		expect.assertions(2);

		expect(isReadonlyArrayOfNumbers.allows([1])).toBe(true);
		expect(isReadonlyArrayOfNumbers.allows(["a"])).toBe(false);
	});

	it("isMaybeReadonlyArrayOfStrings accepts a string array or undefined", ({ expect }) => {
		expect.assertions(3);

		expect(isMaybeReadonlyArrayOfStrings.allows(["a"])).toBe(true);
		expect(isMaybeReadonlyArrayOfStrings.allows(undefined)).toBe(true);
		expect(isMaybeReadonlyArrayOfStrings.allows([1])).toBe(false);
	});

	it("isArrayOfUnknowns accepts arrays of mixed values and rejects non-arrays", ({ expect }) => {
		expect.assertions(3);

		expect(isArrayOfUnknowns.allows([1, "a", null, undefined, { b: 2 }])).toBe(true);
		expect(isArrayOfUnknowns.allows([])).toBe(true);
		expect(isArrayOfUnknowns.allows("a")).toBe(false);
	});

	it("isReadonlyArrayOfUnknowns accepts arrays of mixed values and rejects non-arrays", ({ expect }) => {
		expect.assertions(3);

		expect(isReadonlyArrayOfUnknowns.allows([1, "a", null, undefined, { b: 2 }])).toBe(true);
		expect(isReadonlyArrayOfUnknowns.allows([])).toBe(true);
		expect(isReadonlyArrayOfUnknowns.allows("a")).toBe(false);
	});

	it("isArrayOfNonEmptyStrings accepts arrays of non-empty strings and rejects empty-string members", ({
		expect,
	}) => {
		expect.assertions(4);

		expect(isArrayOfNonEmptyStrings.allows(["a"])).toBe(true);
		expect(isArrayOfNonEmptyStrings.allows([])).toBe(true);
		expect(isArrayOfNonEmptyStrings.allows([""])).toBe(false);
		expect(isArrayOfNonEmptyStrings.allows([1])).toBe(false);
	});

	it("isArrayOfIntegers accepts integer arrays and rejects fractional members", ({ expect }) => {
		expect.assertions(4);

		expect(isArrayOfIntegers.allows([1, 2])).toBe(true);
		expect(isArrayOfIntegers.allows([])).toBe(true);
		expect(isArrayOfIntegers.allows([1, 1.5])).toBe(false);
		expect(isArrayOfIntegers.allows(["1"])).toBe(false);
	});
});

describe("dictionary validators", () => {
	it("isDictionaryOfUnknowns accepts any record", ({ expect }) => {
		expect.assertions(1);

		expect(isDictionaryOfUnknowns.allows({ a: 1 })).toBe(true);
	});

	it("isReadonlyDictionaryOfUnknowns accepts any record", ({ expect }) => {
		expect.assertions(1);

		expect(isReadonlyDictionaryOfUnknowns.allows({ a: 1 })).toBe(true);
	});

	it("isDictionaryOfStrings accepts string records and rejects non-string records", ({ expect }) => {
		expect.assertions(2);

		expect(isDictionaryOfStrings.allows({ a: "b" })).toBe(true);
		expect(isDictionaryOfStrings.allows({ a: 1 })).toBe(false);
	});

	it("isReadonlyDictionaryOfStrings accepts string records and rejects non-string records", ({ expect }) => {
		expect.assertions(2);

		expect(isReadonlyDictionaryOfStrings.allows({ a: "b" })).toBe(true);
		expect(isReadonlyDictionaryOfStrings.allows({ a: 1 })).toBe(false);
	});

	it("isDictionaryOfBooleans accepts boolean records and rejects non-boolean records", ({ expect }) => {
		expect.assertions(4);

		expect(isDictionaryOfBooleans.allows({ a: true })).toBe(true);
		expect(isDictionaryOfBooleans.allows({ a: true, b: false })).toBe(true);
		expect(isDictionaryOfBooleans.allows({})).toBe(true);
		expect(isDictionaryOfBooleans.allows({ a: 1 })).toBe(false);
	});

	it("isDictionaryOfIntegers accepts integer records and rejects fractional-value records", ({ expect }) => {
		expect.assertions(4);

		expect(isDictionaryOfIntegers.allows({ a: 1 })).toBe(true);
		expect(isDictionaryOfIntegers.allows({})).toBe(true);
		expect(isDictionaryOfIntegers.allows({ a: 1.5 })).toBe(false);
		expect(isDictionaryOfIntegers.allows({ a: "1" })).toBe(false);
	});
});

describe("general runtime validators", () => {
	it("isFunction accepts callables and rejects other values", ({ expect }) => {
		expect.assertions(7);

		expect(isFunction.allows(() => {})).toBe(true);
		expect(isFunction.allows(class Example {})).toBe(true);
		expect(isFunction.allows(async () => {})).toBe(true);
		expect(isFunction.allows(function* generate() {})).toBe(true);
		expect(isFunction.allows({})).toBe(false);
		expect(isFunction.allows(null)).toBe(false);
		expect(isFunction.allows(undefined)).toBe(false);
	});

	it("isNever rejects every value", ({ expect }) => {
		expect.assertions(6);

		expect(isNever.allows(0)).toBe(false);
		expect(isNever.allows("")).toBe(false);
		expect(isNever.allows(null)).toBe(false);
		expect(isNever.allows(undefined)).toBe(false);
		expect(isNever.allows([])).toBe(false);
		expect(isNever.allows({})).toBe(false);
	});

	it("isObject accepts objects, arrays, and callables and rejects nullish values", ({ expect }) => {
		expect.assertions(7);

		expect(isObject.allows({})).toBe(true);
		expect(isObject.allows([])).toBe(true);
		expect(isObject.allows(new Date())).toBe(true);
		expect(isObject.allows(/regex/u)).toBe(true);
		expect(isObject.allows(() => {})).toBe(true);
		expect(isObject.allows(null)).toBe(false);
		expect(isObject.allows(undefined)).toBe(false);
	});

	it("isArrayBuffer accepts ArrayBuffer instances and rejects related but distinct values", ({ expect }) => {
		expect.assertions(5);

		expect(isArrayBuffer.allows(new ArrayBuffer(8))).toBe(true);
		expect(isArrayBuffer.allows(new Uint8Array(4))).toBe(false);
		expect(isArrayBuffer.allows(new SharedArrayBuffer(8))).toBe(false);
		expect(isArrayBuffer.allows({})).toBe(false);
		expect(isArrayBuffer.allows(null)).toBe(false);
	});
});

describe("number range validators", () => {
	it("isPositiveNumber accepts positive numbers including fractions and rejects zero and negatives", ({ expect }) => {
		expect.assertions(5);

		expect(isPositiveNumber.allows(1)).toBe(true);
		expect(isPositiveNumber.allows(0.5)).toBe(true);
		expect(isPositiveNumber.allows(0)).toBe(false);
		expect(isPositiveNumber.allows(-1)).toBe(false);
		expect(isPositiveNumber.allows("1")).toBe(false);
	});

	it("isMaybePositiveNumber accepts a positive number or undefined", ({ expect }) => {
		expect.assertions(5);

		expect(isMaybePositiveNumber.allows(1)).toBe(true);
		expect(isMaybePositiveNumber.allows(0.5)).toBe(true);
		expect(isMaybePositiveNumber.allows(undefined)).toBe(true);
		expect(isMaybePositiveNumber.allows(0)).toBe(false);
		expect(isMaybePositiveNumber.allows(null)).toBe(false);
	});

	it("isNonNegativeNumber accepts zero and positive numbers including fractions", ({ expect }) => {
		expect.assertions(5);

		expect(isNonNegativeNumber.allows(0)).toBe(true);
		expect(isNonNegativeNumber.allows(1)).toBe(true);
		expect(isNonNegativeNumber.allows(0.5)).toBe(true);
		expect(isNonNegativeNumber.allows(-1)).toBe(false);
		expect(isNonNegativeNumber.allows("0")).toBe(false);
	});

	it("isMaybeNonNegativeNumber accepts a non-negative number or undefined", ({ expect }) => {
		expect.assertions(5);

		expect(isMaybeNonNegativeNumber.allows(0)).toBe(true);
		expect(isMaybeNonNegativeNumber.allows(0.5)).toBe(true);
		expect(isMaybeNonNegativeNumber.allows(undefined)).toBe(true);
		expect(isMaybeNonNegativeNumber.allows(-1)).toBe(false);
		expect(isMaybeNonNegativeNumber.allows(null)).toBe(false);
	});

	it("isEpoch accepts millisecond timestamps and rejects fractional or string values", ({ expect }) => {
		expect.assertions(5);

		expect(isEpoch.allows(0)).toBe(true);
		expect(isEpoch.allows(1_704_067_200_000)).toBe(true);
		expect(isEpoch.allows(-1)).toBe(true);
		expect(isEpoch.allows(1.5)).toBe(false);
		expect(isEpoch.allows("1704067200000")).toBe(false);
	});
});

describe("format string validators", () => {
	it("isEmailString accepts email addresses and rejects other strings", ({ expect }) => {
		expect.assertions(5);

		expect(isEmailString.allows("user@example.com")).toBe(true);
		expect(isEmailString.allows("first.last@example.co.uk")).toBe(true);
		expect(isEmailString.allows("not-an-email")).toBe(false);
		expect(isEmailString.allows("")).toBe(false);
		expect(isEmailString.allows("user@")).toBe(false);
	});

	it("isUrlString accepts URLs and rejects non-URL strings", ({ expect }) => {
		expect.assertions(4);

		expect(isUrlString.allows("https://example.com")).toBe(true);
		expect(isUrlString.allows("http://www.example.com/path?q=1")).toBe(true);
		expect(isUrlString.allows("not a url")).toBe(false);
		expect(isUrlString.allows("")).toBe(false);
	});

	it("isSemverString accepts semver strings and rejects malformed versions", ({ expect }) => {
		expect.assertions(6);

		expect(isSemverString.allows("1.2.3")).toBe(true);
		expect(isSemverString.allows("1.2.3-beta.1")).toBe(true);
		expect(isSemverString.allows("1.2")).toBe(false);
		expect(isSemverString.allows("v1.2.3")).toBe(false);
		expect(isSemverString.allows("1.2.3.4")).toBe(false);
		expect(isSemverString.allows("")).toBe(false);
	});

	it("isMaybeUrlString accepts a URL string or undefined", ({ expect }) => {
		expect.assertions(4);

		expect(isMaybeUrlString.allows("https://example.com")).toBe(true);
		expect(isMaybeUrlString.allows(undefined)).toBe(true);
		expect(isMaybeUrlString.allows(null)).toBe(false);
		expect(isMaybeUrlString.allows("not a url")).toBe(false);
	});
});

describe("transform validators", () => {
	it("isStringToNumber accepts numeric strings and rejects non-numeric ones", ({ expect }) => {
		expect.assertions(6);

		expect(isStringToNumber.allows("123")).toBe(true);
		expect(isStringToNumber.allows("-1")).toBe(true);
		expect(isStringToNumber.allows("1.5")).toBe(true);
		expect(isStringToNumber.allows("")).toBe(false);
		expect(isStringToNumber.allows("1e3")).toBe(false);
		expect(isStringToNumber.allows("abc")).toBe(false);
	});

	it("isStringToNumber parses numeric strings into numbers", ({ expect }) => {
		expect.assertions(2);

		expect(isStringToNumber("42")).toBe(42);
		expect(isStringToNumber("-1.5")).toBe(-1.5);
	});

	it("isNumberOrStringToBoolean accepts strings and numbers", ({ expect }) => {
		expect.assertions(6);

		expect(isNumberOrStringToBoolean.allows("true")).toBe(true);
		expect(isNumberOrStringToBoolean.allows("false")).toBe(true);
		expect(isNumberOrStringToBoolean.allows(1)).toBe(true);
		expect(isNumberOrStringToBoolean.allows(0)).toBe(true);
		expect(isNumberOrStringToBoolean.allows({})).toBe(false);
		expect(isNumberOrStringToBoolean.allows(null)).toBe(false);
	});

	it("isNumberOrStringToBoolean maps only truthy markers to true", ({ expect }) => {
		expect.assertions(4);

		expect(isNumberOrStringToBoolean("true")).toBe(true);
		expect(isNumberOrStringToBoolean("1")).toBe(true);
		expect(isNumberOrStringToBoolean(1)).toBe(true);
		expect(isNumberOrStringToBoolean(0)).toBe(false);
	});
});

describe("undeclared-key behavior constants", () => {
	it('reject is the literal "reject"', ({ expect }) => {
		expect.assertions(1);

		expect(REJECT).toBe("reject");
	});

	it('ignore is the literal "ignore"', ({ expect }) => {
		expect.assertions(1);

		expect(IGNORE).toBe("ignore");
	});

	it('delete is the literal "delete"', ({ expect }) => {
		expect.assertions(1);

		expect(DELETE).toBe("delete");
	});
});

// Type-only assertions, so `tsrs --build` is what enforces these.
describe("exported types", () => {
	it("infers the record shapes tools read off the validators", () => {
		// oxlint-disable-next-line small-rules/no-unsafe-dictionary-type -- the shape this package exports
		expectTypeOf<DictionaryOfUnknowns>().toEqualTypeOf<Record<string, unknown>>();
		expectTypeOf<MaybeReadonlyDictionaryOfStrings>().toEqualTypeOf<Readonly<Record<string, string>> | undefined>();
		expectTypeOf<UndeclaredKeyBehavior>().toEqualTypeOf<"delete" | "ignore" | "reject">();
	});

	it("exports the undeclared-key behavior constants as literals", () => {
		expectTypeOf(REJECT).toEqualTypeOf<"reject">();
		expectTypeOf(IGNORE).toEqualTypeOf<"ignore">();
		expectTypeOf(DELETE).toEqualTypeOf<"delete">();
	});
});
