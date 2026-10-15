import { describe, expectTypeOf, it } from "vitest";

import {
	isArrayOfNumbers,
	isArrayOfStrings,
	isArrayOfUnknowns,
	isBoolean,
	isDictionaryOfStrings,
	isDictionaryOfUnknowns,
	isFalse,
	isInteger,
	isIsoDateString,
	isJsonObject,
	isMaybeBoolean,
	isMaybeInteger,
	isMaybeJsonObject,
	isMaybeNonEmptyString,
	isMaybeNonNegativeInteger,
	isMaybeNull,
	isMaybeNumber,
	isMaybePositiveInteger,
	isMaybeReadonlyArrayOfStrings,
	isMaybeReadonlyDictionaryOfStrings,
	isMaybeString,
	isNonEmptyString,
	isNonNegativeInteger,
	isNull,
	isNullableString,
	isNumber,
	isPositiveInteger,
	isReadonlyArrayOfNumbers,
	isReadonlyArrayOfStrings,
	isReadonlyArrayOfUnknowns,
	isReadonlyDictionaryOfStrings,
	isReadonlyDictionaryOfUnknowns,
	isString,
	isTrue,
	isUndefined,
	isUnixTimestamp,
	isUnknown,
} from "./index.ts";

import type { DictionaryOfUnknowns, MaybeReadonlyDictionaryOfStrings, UndeclaredKeyBehavior } from "./index.ts";

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
});

// Type-only assertions, so `tsc --build` is what enforces these.
describe("exported types", () => {
	it("infers the record shapes tools read off the validators", () => {
		// oxlint-disable-next-line small-rules/no-unsafe-dictionary-type -- the shape this package exports
		expectTypeOf<DictionaryOfUnknowns>().toEqualTypeOf<Record<string, unknown>>();
		expectTypeOf<MaybeReadonlyDictionaryOfStrings>().toEqualTypeOf<Readonly<Record<string, string>> | undefined>();
		expectTypeOf<UndeclaredKeyBehavior>().toEqualTypeOf<"delete" | "ignore" | "reject">();
	});
});
