import { type } from "arktype";

export const isBoolean = type("boolean");
export const isTrue = type("true");
export const isFalse = type("false");

export const isUndefined = type("undefined");
export const isUnknown = type("unknown");
export const isNull = type("null");

export const isString = type("string");
export const isNonEmptyString = type("string > 0");
export const isMaybeNonEmptyString = isNonEmptyString.or(isUndefined);

export const isIsoDateString = type("string.date.iso");

export const isNumber = type("number");
export const isMaybeNumber = isNumber.or(isUndefined);

export const isInteger = type("number % 1");
export const isMaybeInteger = isInteger.or(isUndefined);

export const isPositiveInteger = type("number % 1 > 0");
export const isMaybePositiveInteger = isPositiveInteger.or(isUndefined);

export const isNonNegativeInteger = type("number % 1 >= 0");
export const isMaybeNonNegativeInteger = isNonNegativeInteger.or(isUndefined);

export const isUnixTimestamp = type("number.epoch");

export const isJsonObject = type("object.json");
export const isMaybeJsonObject = isJsonObject.or(isUndefined);

export const isMaybeString = isString.or(isUndefined);
export const isNullableString = isString.or(isNull);

export const isMaybeBoolean = isBoolean.or(isUndefined);

export const isMaybeNull = isNull.or(isUndefined);

export const isArrayOfStrings = isString.array();
export const isReadonlyArrayOfStrings = isArrayOfStrings.readonly();

export const isArrayOfUnknowns = isUnknown.array();
export const isReadonlyArrayOfUnknowns = isArrayOfUnknowns.readonly();

export const isArrayOfNumbers = isNumber.array();
export const isReadonlyArrayOfNumbers = isArrayOfNumbers.readonly();

export const isMaybeReadonlyArrayOfStrings = isReadonlyArrayOfStrings.or(isUndefined);

export const isDictionaryOfUnknowns = type.Record(isString, isUnknown);
export const isReadonlyDictionaryOfUnknowns = isDictionaryOfUnknowns.readonly();

export type DictionaryOfUnknowns = typeof isDictionaryOfUnknowns.infer;

export const isFunction = type("Function");
export const isNever = type("never");
export const isObject = type("object");

export const isPositiveNumber = type("number > 0");
export const isMaybePositiveNumber = isPositiveNumber.or(isUndefined);

export const isNonNegativeNumber = type("number >= 0");
export const isMaybeNonNegativeNumber = isNonNegativeNumber.or(isUndefined);

export const isEpoch = type("number.epoch");

export const isEmailString = type("string.email");
export const isUrlString = type("string.url");
export const isSemverString = type("string.semver");

export const isStringToNumber = type("string.numeric.parse");
export const isNumberOrStringToBoolean = isString
	.or(isNumber)
	.pipe((value) => value === "true" || value === "1" || value === 1);

export const isArrayBuffer = type("ArrayBuffer");

export const isArrayOfNonEmptyStrings = isNonEmptyString.array();

export const isArrayOfIntegers = isInteger.array();

export const isDictionaryOfBooleans = type.Record(isString, isBoolean);
export const isDictionaryOfIntegers = type.Record(isString, isInteger);

export const isMaybeUrlString = isUrlString.or(isUndefined);

export const isOptionalBoolean = isMaybeBoolean.or(isNull);
export const isOptionalNumber = isMaybeNumber.or(isNull);
export const isOptionalString = isMaybeString.or(isNull);
export const isOptionalReadonlyArrayOfStrings = isMaybeReadonlyArrayOfStrings.or(isNull);
export const isOptionalNonNegativeInteger = isNonNegativeInteger.or(isMaybeNull);
export const isOptionalUrlString = isMaybeUrlString.or(isNull);

export const isDictionaryOfStrings = type.Record(isString, isString);
export const isReadonlyDictionaryOfStrings = isDictionaryOfStrings.readonly();
export const isMaybeReadonlyDictionaryOfStrings = isReadonlyDictionaryOfStrings.or(isUndefined);
export const isOptionalReadonlyDictionaryOfStrings = isMaybeReadonlyDictionaryOfStrings.or(isNull);

export type MaybeReadonlyDictionaryOfStrings = typeof isMaybeReadonlyDictionaryOfStrings.infer;

// Unexported and redeclared ArkType types
export const REJECT = "reject" as const;
export const IGNORE = "ignore" as const;
export const DELETE = "delete" as const;

export type UndeclaredKeyBehavior = "delete" | "ignore" | "reject";
