import nodePath from "node:path";
import { describe, it } from "vitest";
import { ValidationError } from "@cliffy/command";

import { InterruptAction } from "$generation/interrupt-guard";

import {
	checkCanSpend,
	checkModelIds,
	collectPrepared,
	combineInterruptActions,
	describeTotalCost,
	getCompareDirectory,
	getModelFileStem,
} from "./compare-plan";

describe("getModelFileStem", () => {
	it("keeps dots and dashes and replaces the provider slash", ({ expect }) => {
		expect.assertions(1);

		expect(getModelFileStem("recraft/recraft-v4.1-flash")).toBe("recraft_recraft-v4.1-flash");
	});
});

describe("checkModelIds", () => {
	it("needs at least two models", ({ expect }) => {
		expect.assertions(1);

		expect(() => {
			checkModelIds(["a/one"]);
		}).toThrow("at least two models");
	});

	it("rejects a model given twice and points at -n", ({ expect }) => {
		expect.assertions(1);

		expect(() => {
			checkModelIds(["a/one", "b/two", "a/one"]);
		}).toThrow("a/one is given more than once. Use -n");
	});
});

describe("getCompareDirectory", () => {
	it("puts the folder in -o, or the current directory", ({ expect }) => {
		expect.assertions(2);

		expect(getCompareDirectory(undefined, "/work", "2026-10-15_cat")).toBe(
			nodePath.join("/work", "2026-10-15_cat"),
		);
		expect(getCompareDirectory("out", "/work", "2026-10-15_cat")).toBe(
			nodePath.join("/work/out", "2026-10-15_cat"),
		);
	});

	it("refuses stdout and image file names", ({ expect }) => {
		expect.assertions(2);

		expect(() => getCompareDirectory("-", "/work", "x")).toThrow("can't write to stdout");
		expect(() => getCompareDirectory("cat.png", "/work", "x")).toThrow("looks like an image file");
	});
});

describe("combineInterruptActions", () => {
	it("lets saving finish, then aborts, and exits only when every run is idle", ({ expect }) => {
		expect.assertions(3);

		expect(combineInterruptActions([InterruptAction.Abort, InterruptAction.Defer, InterruptAction.Exit])).toBe(
			InterruptAction.Defer,
		);
		expect(combineInterruptActions([InterruptAction.Exit, InterruptAction.Abort])).toBe(InterruptAction.Abort);
		expect(combineInterruptActions([InterruptAction.Exit, InterruptAction.Exit])).toBe(InterruptAction.Exit);
	});
});

describe("describeTotalCost", () => {
	it("adds exact, approximate, and unknown estimates", ({ expect }) => {
		expect.assertions(3);

		const exact = { isApproximate: false, provider: "p", usd: 0.007 };
		const approximate = { isApproximate: true, provider: "p", usd: 0.018 };

		expect(describeTotalCost([exact, exact])).toBe("$0.014");
		expect(describeTotalCost([exact, approximate])).toBe("≈ $0.025");
		expect(describeTotalCost([exact, undefined])).toBe("≥ $0.007");
	});
});

describe("collectPrepared", () => {
	it("keeps every request when all models are valid", ({ expect }) => {
		expect.assertions(1);

		expect(
			collectPrepared([
				{ status: "fulfilled", value: "a" },
				{ status: "fulfilled", value: "b" },
			]),
		).toStrictEqual(["a", "b"]);
	});

	it("reports every model's problem at once", ({ expect }) => {
		expect.assertions(1);

		const settled: Array<PromiseSettledResult<string>> = [
			{ reason: new ValidationError("a/one does not support -a 21:9."), status: "rejected" },
			{ status: "fulfilled", value: "b" },
			{ reason: new ValidationError("c/three returns at most 1 image."), status: "rejected" },
		];

		expect(() => collectPrepared(settled)).toThrow(
			"a/one does not support -a 21:9.\nc/three returns at most 1 image.",
		);
	});

	it("passes other errors through untouched", ({ expect }) => {
		expect.assertions(1);

		const failure = new Error("No API key.");

		expect(() => collectPrepared([{ reason: failure, status: "rejected" }])).toThrow(failure);
	});
});

describe("checkCanSpend", () => {
	it("needs a terminal, a dry run, or --yes", ({ expect }) => {
		expect.assertions(4);

		expect(() => {
			checkCanSpend({ isDryRun: false, isTerminal: false, skipConfirmation: false });
		}).toThrow("pass --yes");
		expect(() => {
			checkCanSpend({ isDryRun: false, isTerminal: true, skipConfirmation: false });
		}).not.toThrow();
		expect(() => {
			checkCanSpend({ isDryRun: true, isTerminal: false, skipConfirmation: false });
		}).not.toThrow();
		expect(() => {
			checkCanSpend({ isDryRun: false, isTerminal: false, skipConfirmation: true });
		}).not.toThrow();
	});
});
