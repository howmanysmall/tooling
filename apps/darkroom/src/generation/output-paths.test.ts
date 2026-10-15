import { describe, it } from "vitest";

import { addCollisionSuffix, getOutputPath, OutputKind, parseOutputSpec, slugify } from "./output-paths";

describe("slugify", () => {
	it("turns a prompt into lower-case kebab case without punctuation or accents", ({ expect }) => {
		expect.assertions(3);

		expect(slugify("a cat in a hat")).toBe("a-cat-in-a-hat");
		expect(slugify("A Cat, in a HAT!!")).toBe("a-cat-in-a-hat");
		expect(slugify("café crème — über")).toBe("cafe-creme-uber");
	});

	it("cuts long prompts at a word boundary within 40 characters", ({ expect }) => {
		expect.assertions(2);

		const slug = slugify("a very detailed watercolor painting of a lighthouse at dawn in fog");

		expect(slug).toBe("a-very-detailed-watercolor-painting-of-a");
		expect(slug.length).toBeLessThanOrEqual(40);
	});

	it("falls back to image when nothing usable is left", ({ expect }) => {
		expect.assertions(1);

		expect(slugify("!!! ???")).toBe("image");
	});
});

describe("output paths", () => {
	const naming = { count: 1, date: "2026-10-14", extension: "png", index: 1, slug: "a-cat" };

	it("names images by date, slug, and number in the target directory", ({ expect }) => {
		expect.assertions(2);

		const spec = parseOutputSpec(undefined, "/work", false);

		expect(spec).toStrictEqual({ directory: "/work", kind: OutputKind.Directory });
		expect(getOutputPath({ directory: "/work", kind: OutputKind.Directory }, naming)).toBe(
			"/work/2026-10-14_a-cat_1.png",
		);
	});

	it("uses the stem instead of the date and slug when one is given", ({ expect }) => {
		expect.assertions(1);

		const spec = {
			directory: "/work/cmp",
			kind: OutputKind.Directory,
			stem: "recraft_recraft-v4.1-flash",
		} as const;

		expect(getOutputPath(spec, naming)).toBe("/work/cmp/recraft_recraft-v4.1-flash_1.png");
	});

	it("treats a trailing slash or an existing directory as a directory", ({ expect }) => {
		expect.assertions(2);

		expect(parseOutputSpec("out/", "/work", false)).toStrictEqual({
			directory: "/work/out",
			kind: OutputKind.Directory,
		});
		expect(parseOutputSpec("out", "/work", true)).toStrictEqual({
			directory: "/work/out",
			kind: OutputKind.Directory,
		});
	});

	it("uses an explicit file name as is for one image and numbers it for several", ({ expect }) => {
		expect.assertions(3);

		const spec = { kind: OutputKind.File, path: "/work/name.png" } as const;

		expect(getOutputPath(spec, naming)).toBe("/work/name.png");
		expect(getOutputPath(spec, { ...naming, count: 2, index: 2 })).toBe("/work/name_2.png");
		expect(getOutputPath({ kind: OutputKind.File, path: "/work/name" }, naming)).toBe("/work/name.png");
	});

	it("maps - to stdout and adds -N before the extension on collisions", ({ expect }) => {
		expect.assertions(3);

		expect(parseOutputSpec("-", "/work", false)).toStrictEqual({ kind: OutputKind.Stdout });
		expect(addCollisionSuffix("/work/a.png", 1)).toBe("/work/a.png");
		expect(addCollisionSuffix("/work/a.png", 3)).toBe("/work/a-3.png");
	});
});
