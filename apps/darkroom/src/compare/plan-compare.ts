import nodePath from "node:path";

import { describeEstimate, getCostEstimate, toEstimateRequest } from "$generation/cost-estimate";
import { formatLocalDate, slugify } from "$generation/output-paths";
import { createUlid } from "$history/ulid";

import {
	checkModelIds,
	collectPrepared,
	describeTotalCost,
	getCompareDirectory,
	getModelFileStem,
} from "./compare-plan";

import type { CostEstimate } from "$generation/cost-estimate";
import type { ObservedPrices } from "$generation/observed-prices";
import type { ReferenceImage } from "$generation/references";
import type { GenerationInput, PreparedGeneration } from "$generation/run-generation";
import type { GenerationOptions } from "$generation/validate-request";
import type { ModelPricing } from "$utilities/model-pricing-utilities";

// Everything `compare` knows before spending, shared by the CLI and the MCP
// server, which differ only in how they validate and report.

export interface CompareRequest {
	/** The models, in the order given; results are reported in this order. */
	readonly modelIds: ReadonlyArray<string>;
	/**
	 * The generate options, applied to every model. `output` is the parent
	 * directory.
	 */
	readonly options: GenerationOptions;
	readonly prompt: string;
	readonly references: ReadonlyArray<ReferenceImage>;
}

export interface ModelEstimate {
	readonly estimate?: CostEstimate | undefined;
	readonly text: string;
}

/** Everything known before spending: the validated requests and their costs. */
export interface ComparePlan {
	readonly batch: string;
	readonly directory: string;
	readonly estimates: ReadonlyArray<ModelEstimate>;
	readonly prepared: ReadonlyArray<PreparedGeneration>;
	/** The estimated total, like `$0.025` or `≥ $0.007`. */
	readonly total: string;
}

export interface PlanDependencies {
	readonly cwd: string;
	readonly now: () => Date;
	/** Validates one model's request; the CLI's version also logs warnings. */
	readonly prepare: (input: GenerationInput) => Promise<PreparedGeneration>;
	readonly warn: (message: string) => void;
}

export interface EstimateDependencies {
	readonly getObservedPricesAsync: () => Promise<ObservedPrices>;
	readonly getPricingAsync: () => Promise<ModelPricing>;
	readonly warn: (message: string) => void;
}

async function prepareAllAsync(
	request: CompareRequest,
	{ batch, directory }: { readonly batch: string; readonly directory: string },
	prepare: PlanDependencies["prepare"],
): Promise<Array<PreparedGeneration>> {
	const settled = await Promise.allSettled(
		request.modelIds.map(async (modelId) =>
			prepare({
				batch,
				force: false,
				modelId,
				options: { ...request.options, output: `${directory}${nodePath.sep}` },
				outputStem: getModelFileStem(modelId),
				prompt: request.prompt,
				references: request.references,
			}),
		),
	);
	return collectPrepared(settled);
}

/**
 * Estimates each prepared request from the cached prices and past runs.
 * Without prices every estimate is unknown, which the estimates then say.
 *
 * @param prepared - The validated requests.
 * @param dependencies - Where prices and past runs come from.
 * @returns Each request's estimate, in the same order.
 */
export async function getEstimatesAsync(
	prepared: ReadonlyArray<PreparedGeneration>,
	dependencies: EstimateDependencies,
): Promise<Array<ModelEstimate>> {
	const observedPromise = dependencies.getObservedPricesAsync();
	let pricing: ModelPricing = {};
	try {
		pricing = await dependencies.getPricingAsync();
	} catch (error) {
		dependencies.warn(`Could not read prices: ${error instanceof Error ? error.message : String(error)}`);
	}
	const observed = await observedPromise;

	return prepared.map((item) => {
		const endpoints = pricing[item.model.id] ?? [];
		const estimate = getCostEstimate(endpoints, toEstimateRequest(item), observed.get(item.model.id));
		return { estimate, text: describeEstimate(estimate, endpoints) };
	});
}

/**
 * Validates every model and estimates the cost, without spending anything.
 *
 * @param request - The prompt, models, options, and references.
 * @param dependencies - How to validate, the clock, and the working directory.
 * @param estimateDependencies - Where prices and past runs come from.
 * @returns The validated requests, their estimates, and the folder to save into.
 * @rejects A `ValidationError` listing every model's problem.
 */
export async function planCompareAsync(
	request: CompareRequest,
	dependencies: PlanDependencies,
	estimateDependencies: EstimateDependencies,
): Promise<ComparePlan> {
	checkModelIds(request.modelIds);
	const now = dependencies.now();
	const folderName = `${formatLocalDate(now)}_${slugify(request.prompt)}`;
	const directory = getCompareDirectory(request.options.output, dependencies.cwd, folderName);
	const batch = createUlid(now.getTime());

	const prepared = await prepareAllAsync(request, { batch, directory }, dependencies.prepare);
	const estimates = await getEstimatesAsync(prepared, estimateDependencies);
	const total = describeTotalCost(estimates.map(({ estimate }) => estimate));
	return { batch, directory, estimates, prepared, total };
}
