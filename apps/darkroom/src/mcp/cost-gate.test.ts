import { describe, it } from "vitest";

import { checkBudget } from "./cost-gate";

const EIGHT_CENTS = { isApproximate: false, provider: "test", usd: 0.08 };
const TWO_CENTS = { isApproximate: false, provider: "test", usd: 0.02 };

describe("checkBudget", () => {
	it("allows a request estimated under maxCost", ({ expect }) => {
		expect.assertions(1);

		expect(checkBudget([EIGHT_CENTS], { maxCost: 0.1 })).toStrictEqual({ isAllowed: true });
	});

	// Catches a paid request estimated above the caller's limit being sent.
	it("refuses a request estimated over maxCost", ({ expect }) => {
		expect.assertions(1);

		expect(checkBudget([EIGHT_CENTS], { maxCost: 0.05 })).toMatchObject({ isAllowed: false });
	});

	// Catches a comparison passing because each model alone fits the limit.
	it("checks the total of several models against maxCost", ({ expect }) => {
		expect.assertions(1);

		expect(checkBudget([EIGHT_CENTS, TWO_CENTS], { maxCost: 0.09 })).toMatchObject({ isAllowed: false });
	});

	// Catches a request with no known price being sent despite a limit.
	it("refuses an unknown price under a limit unless allowUnknownCost is set", ({ expect }) => {
		expect.assertions(2);

		expect(checkBudget([undefined], { maxCost: 1 })).toMatchObject({ isAllowed: false });
		expect(checkBudget([undefined], { allowUnknownCost: true, maxCost: 1 })).toStrictEqual({ isAllowed: true });
	});

	// Catches a partly priced request passing when its known part is over.
	it("refuses a partly unknown price whose known part is already over maxCost", ({ expect }) => {
		expect.assertions(1);

		expect(checkBudget([EIGHT_CENTS, undefined], { allowUnknownCost: true, maxCost: 0.05 })).toMatchObject({
			isAllowed: false,
		});
	});

	// Catches calls without a limit being refused.
	it("allows anything when no maxCost is given", ({ expect }) => {
		expect.assertions(1);

		expect(checkBudget([undefined, EIGHT_CENTS], {})).toStrictEqual({ isAllowed: true });
	});
});
