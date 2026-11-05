import { isNull, isNumber, isString } from "@howmanysmall/arktype-utilities";
import { type } from "arktype";

const isSccLanguage = type({
	Blank: isNumber,
	Code: isNumber,
	Comment: isNumber,
	Complexity: isNumber,
	Count: isNumber,
	Name: isString,
}).readonly();

export const isSccOutput = type("string.json.parse").to(isSccLanguage.array().readonly().or(isNull));
