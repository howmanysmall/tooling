import { describeTotalCost } from "$compare/compare-plan";

import type { CostEstimate } from "$generation/cost-estimate";

export interface Budget {
	/** Spend when some prices are unknown, if the known part fits. */
	readonly allowUnknownCost?: boolean | undefined;
	/** The most the caller will spend, in US dollars. No limit when absent. */
	readonly maxCost?: number | undefined;
}

export type BudgetCheck = { readonly isAllowed: false; readonly reason: string } | { readonly isAllowed: true };

/**
 * Decides whether a paid request fits the caller's budget. Without a
 * `maxCost` everything is allowed; with one, a request whose estimate is over
 * it is refused, and so is one with an unknown price unless the caller allows
 * unknown prices.
 *
 * @param estimates - Each request's estimate, or `undefined` when unknown.
 * @param budget - The caller's limit.
 * @param budget.allowUnknownCost - Spend when some prices are unknown.
 * @param budget.maxCost - The most to spend, in US dollars.
 * @returns Whether to spend, and why not.
 */
export function checkBudget(
	estimates: ReadonlyArray<CostEstimate | undefined>,
	{ allowUnknownCost, maxCost }: Budget,
): BudgetCheck {
	if (maxCost === undefined) return { isAllowed: true };

	const total = describeTotalCost(estimates);
	let usd = 0;
	for (const estimate of estimates) usd += estimate?.usd ?? 0;

	if (usd > maxCost) {
		return { isAllowed: false, reason: `Estimated cost ${total} is over maxCost $${maxCost}. Nothing was sent.` };
	}

	if (allowUnknownCost !== true && estimates.includes(undefined)) {
		return {
			isAllowed: false,
			reason: `The cost can't be estimated (${total}), so maxCost $${maxCost} can't be checked. Pass allowUnknownCost to send anyway. Nothing was sent.`,
		};
	}

	return { isAllowed: true };
}
