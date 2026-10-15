import { describe, it } from "vitest";

import {
	applyCasing,
	Casing,
	copy,
	detect,
	isCamelCase,
	isConstantCase,
	isDotCase,
	isKebabCase,
	isLowerCase,
	isPascalCase,
	isPathCase,
	isSnakeCase,
	isTitleCase,
	isUnknown,
	isUpperCase,
	setLocaleMode,
	toCamelCase,
	toConstantCase,
	toDotCase,
	toKebabCase,
	toLowerCase,
	toPascalCase,
	toPathCase,
	toSnakeCase,
	toSpaceCase,
	toTitleCase,
	toUpperCase,
} from "./casing-utilities";

describe("word splitting", () => {
	it("splits on spaces, dots, slashes, hyphens, and underscores", ({ expect }) => {
		expect.assertions(5);

		expect(toSnakeCase("foo bar")).toBe("foo_bar");
		expect(toSnakeCase("foo.bar")).toBe("foo_bar");
		expect(toSnakeCase("foo/bar")).toBe("foo_bar");
		expect(toSnakeCase("foo-bar")).toBe("foo_bar");
		expect(toSnakeCase("foo_bar")).toBe("foo_bar");
	});

	it("splits on lower-to-upper camel boundaries", ({ expect }) => {
		expect.assertions(2);

		expect(toSnakeCase("helloWorld")).toBe("hello_world");
		expect(toKebabCase("HelloWorld")).toBe("hello-world");
	});

	// Catches "xmlhttp-request" and "x-m-l-http-request".
	it("keeps acronyms together and splits before the next word", ({ expect }) => {
		expect.assertions(2);

		expect(toKebabCase("XMLHttpRequest")).toBe("xml-http-request");
		expect(toSnakeCase("parseHTMLString")).toBe("parse_html_string");
	});

	it("collapses runs of separators and drops leading and trailing ones", ({ expect }) => {
		expect.assertions(2);

		expect(toSnakeCase("__foo__bar__")).toBe("foo_bar");
		expect(toKebabCase("  foo \t bar  ")).toBe("foo-bar");
	});

	it("returns an empty string for empty input", ({ expect }) => {
		expect.assertions(2);

		expect(toCamelCase("")).toBe("");
		expect(toSnakeCase("")).toBe("");
	});
});

describe("line breaks", () => {
	// Catches words from two lines being joined into one identifier.
	it("transforms each line independently and preserves the break", ({ expect }) => {
		expect.assertions(3);

		expect(toSnakeCase("foo bar\nbaz qux")).toBe("foo_bar\nbaz_qux");
		expect(toSnakeCase("foo bar\rbaz qux")).toBe("foo_bar\rbaz_qux");
		expect(toSnakeCase("foo bar\r\nbaz qux")).toBe("foo_bar\r\nbaz_qux");
	});

	it("restarts capitalization on each line", ({ expect }) => {
		expect.assertions(1);

		expect(toPascalCase("foo bar\nbaz qux")).toBe("FooBar\nBazQux");
	});
});

describe("transformers", () => {
	it("converts to camelCase", ({ expect }) => {
		expect.assertions(3);

		expect(toCamelCase("hello world")).toBe("helloWorld");
		expect(toCamelCase("foo_bar-baz")).toBe("fooBarBaz");
		expect(toCamelCase("FooBar")).toBe("fooBar");
	});

	it("converts to PascalCase", ({ expect }) => {
		expect.assertions(2);

		expect(toPascalCase("hello world")).toBe("HelloWorld");
		expect(toPascalCase("foo_bar")).toBe("FooBar");
	});

	it("converts to CONSTANT_CASE", ({ expect }) => {
		expect.assertions(2);

		expect(toConstantCase("helloWorld")).toBe("HELLO_WORLD");
		expect(toConstantCase("hello world")).toBe("HELLO_WORLD");
	});

	it("converts to dot.case and path/case", ({ expect }) => {
		expect.assertions(2);

		expect(toDotCase("hello world")).toBe("hello.world");
		expect(toPathCase("hello world")).toBe("hello/world");
	});

	it("converts to Title Case", ({ expect }) => {
		expect.assertions(2);

		expect(toTitleCase("hello world")).toBe("Hello World");
		expect(toTitleCase("hello_big-world")).toBe("Hello Big World");
	});

	it("converts to lower and upper case with spaces between words", ({ expect }) => {
		expect.assertions(2);

		expect(toLowerCase("HelloWorld")).toBe("hello world");
		expect(toUpperCase("helloWorld")).toBe("HELLO WORLD");
	});

	it("converts to space case without changing letter case", ({ expect }) => {
		expect.assertions(1);

		expect(toSpaceCase("helloWorld")).toBe("hello World");
	});

	it("handles non-ASCII letters", ({ expect }) => {
		expect.assertions(2);

		expect(toUpperCase("café au lait")).toBe("CAFÉ AU LAIT");
		expect(toSnakeCase("Café Au Lait")).toBe("café_au_lait");
	});
});

describe("predicates", () => {
	it("recognizes camelCase", ({ expect }) => {
		expect.assertions(4);

		expect(isCamelCase("helloWorld")).toBe(true);
		expect(isCamelCase("HelloWorld")).toBe(false);
		expect(isCamelCase("hello_world")).toBe(false);
		expect(isCamelCase("hello world")).toBe(false);
	});

	it("recognizes PascalCase", ({ expect }) => {
		expect.assertions(3);

		expect(isPascalCase("HelloWorld")).toBe(true);
		expect(isPascalCase("helloWorld")).toBe(false);
		expect(isPascalCase("Hello_World")).toBe(false);
	});

	it("recognizes snake_case", ({ expect }) => {
		expect.assertions(4);

		expect(isSnakeCase("hello_world")).toBe(true);
		expect(isSnakeCase("Hello_world")).toBe(false);
		expect(isSnakeCase("hello-world")).toBe(false);
		expect(isSnakeCase("HELLO_WORLD")).toBe(false);
	});

	it("recognizes kebab-case, dot.case, and path/case", ({ expect }) => {
		expect.assertions(6);

		expect(isKebabCase("hello-world")).toBe(true);
		expect(isKebabCase("hello_world")).toBe(false);
		expect(isDotCase("hello.world")).toBe(true);
		expect(isDotCase("hello-world")).toBe(false);
		expect(isPathCase("hello/world")).toBe(true);
		expect(isPathCase("hello.world")).toBe(false);
	});

	it("recognizes CONSTANT_CASE", ({ expect }) => {
		expect.assertions(3);

		expect(isConstantCase("HELLO_WORLD")).toBe(true);
		expect(isConstantCase("hello_world")).toBe(false);
		expect(isConstantCase("Hello_World")).toBe(false);
	});

	it("recognizes Title Case, lower case, and UPPER CASE", ({ expect }) => {
		expect.assertions(6);

		expect(isTitleCase("Hello World")).toBe(true);
		expect(isTitleCase("hello world")).toBe(false);
		expect(isLowerCase("hello world")).toBe(true);
		expect(isLowerCase("Hello world")).toBe(false);
		expect(isUpperCase("HELLO WORLD")).toBe(true);
		expect(isUpperCase("Hello World")).toBe(false);
	});

	it("accepts anything as unknown", ({ expect }) => {
		expect.assertions(2);

		expect(isUnknown("")).toBe(true);
		expect(isUnknown("Any_thing-at.all")).toBe(true);
	});
});

describe("detect", () => {
	it("classifies representative inputs", ({ expect }) => {
		expect.assertions(1);

		const cases: ReadonlyArray<readonly [string, Casing]> = [
			["hello world", Casing.Unknown],
			["Hello World", Casing.TitleCase],
			["foo-bar", Casing.KebabCase],
			["foo_bar", Casing.SnakeCase],
			["FOO_BAR", Casing.ConstantCase],
			["foo.bar", Casing.DotCase],
			["foo/bar", Casing.PathCase],
			["FOOBAR", Casing.UpperCase],
			["FooBar", Casing.PascalCase],
			["Foo", Casing.PascalCase],
			["foobar", Casing.LowerCase],
			["fooBar", Casing.CamelCase],
			["", Casing.Unknown],
			["foo-Bar", Casing.Unknown],
		];
		const actual = cases.map(([value]) => detect(value));

		expect(actual).toStrictEqual(cases.map(([, expected]) => expected));
	});
});

describe("applyCasing", () => {
	it("applies each casing to the same input", ({ expect }) => {
		expect.assertions(10);

		const input = "hello big world";

		expect(applyCasing(input, Casing.CamelCase)).toBe("helloBigWorld");
		expect(applyCasing(input, Casing.ConstantCase)).toBe("HELLO_BIG_WORLD");
		expect(applyCasing(input, Casing.DotCase)).toBe("hello.big.world");
		expect(applyCasing(input, Casing.KebabCase)).toBe("hello-big-world");
		expect(applyCasing(input, Casing.LowerCase)).toBe("hello big world");
		expect(applyCasing(input, Casing.PascalCase)).toBe("HelloBigWorld");
		expect(applyCasing(input, Casing.PathCase)).toBe("hello/big/world");
		expect(applyCasing(input, Casing.SnakeCase)).toBe("hello_big_world");
		expect(applyCasing(input, Casing.TitleCase)).toBe("Hello Big World");
		expect(applyCasing(input, Casing.UpperCase)).toBe("HELLO BIG WORLD");
	});

	it("returns the input unchanged for the unknown casing", ({ expect }) => {
		expect.assertions(1);

		expect(applyCasing("Some_odd-Input", Casing.Unknown)).toBe("Some_odd-Input");
	});

	// Catches a transformer and its detector disagreeing about the same style.
	it("produces output that detect classifies as the requested casing", ({ expect }) => {
		expect.assertions(1);

		const casings = [
			Casing.CamelCase,
			Casing.ConstantCase,
			Casing.DotCase,
			Casing.KebabCase,
			Casing.PascalCase,
			Casing.PathCase,
			Casing.SnakeCase,
		];
		const detected = casings.map((casing) => detect(applyCasing("hello big world", casing)));

		expect(detected).toStrictEqual(casings);
	});
});

describe("copy", () => {
	it("copies the letter case of the previous string onto the next", ({ expect }) => {
		expect.assertions(4);

		expect(copy("Hello", "world")).toBe("World");
		expect(copy("HELLO", "world")).toBe("WORLD");
		expect(copy("hello", "WORLD")).toBe("world");
		expect(copy("hElLo", "world")).toBe("wOrLd");
	});

	it("leaves non-letters alone", ({ expect }) => {
		expect.assertions(1);

		expect(copy("Ab", "1-")).toBe("1-");
	});

	it("returns the next string when either is empty or lengths differ", ({ expect }) => {
		expect.assertions(3);

		expect(copy("", "world")).toBe("world");
		expect(copy("Hello", "")).toBe("");
		expect(copy("Hello", "worlds")).toBe("worlds");
	});

	it("copies case onto non-ASCII letters", ({ expect }) => {
		expect.assertions(1);

		expect(copy("Éa", "éb")).toBe("Éb");
	});
});

describe("setLocaleMode", () => {
	it("keeps results identical for ASCII and non-ASCII input in either mode", ({ expect }) => {
		expect.assertions(4);

		const fastUpper = toUpperCase("café");
		const fastSnake = toSnakeCase("helloWorld");
		setLocaleMode(true);
		const localeUpper = toUpperCase("café");
		const localeSnake = toSnakeCase("helloWorld");
		setLocaleMode(false);

		expect(fastUpper).toBe("CAFÉ");
		expect(fastSnake).toBe("hello_world");
		expect(localeUpper).toBe("CAFÉ");
		expect(localeSnake).toBe("hello_world");
	});

	it("predicates still match in locale mode", ({ expect }) => {
		expect.assertions(2);

		setLocaleMode(true);
		const isUpper = isUpperCase("CAFÉ AU LAIT");
		const isLower = isLowerCase("café au lait");
		setLocaleMode(false);

		expect(isUpper).toBe(true);
		expect(isLower).toBe(true);
	});
});
