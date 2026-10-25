import nodePath from "node:path";
import { ValidationError } from "@cliffy/command";
import { formatArrayAsEnglishList } from "@howmanysmall/english-utilities/format-array-as-english-list";

import { describeEstimate } from "$generation/cost-estimate";
import { InterruptAction } from "$generation/interrupt-guard";
import { getImageTypeFromPath } from "$generation/media-types";

import type { CostEstimate } from "$generation/cost-estimate";

const UNSAFE_FILE_CHARACTERS = /[^\w.-]+/gu;

/**
 * Turns a model ID into the start of a file name, like
 * `recraft_recraft-v4.1-flash`.
 *
 * @param modelId - An OpenRouter ID, like `recraft/recraft-v4.1-flash`.
 * @returns The ID with `/` and unsafe characters replaced by `_`.
 */
export function getModelFileStem(modelId: string): string {
	return modelId.replaceAll(UNSAFE_FILE_CHARACTERS, "_");
}

/**
 * Checks the `-m` list: at least two models, none repeated.
 *
 * @param modelIds - The models, in the order given.
 * @throws {ValidationError} Exit 2, before anything is fetched.
 */
export function checkModelIds(modelIds: ReadonlyArray<string>): void {
	const seen = new Set<string>();
	const repeated = new Set<string>();
	for (const modelId of modelIds) {
		if (seen.has(modelId)) {
			repeated.add(modelId);
		}
		seen.add(modelId);
	}

	if (repeated.size > 0) {
		const names = formatArrayAsEnglishList([...repeated]);
		throw new ValidationError(`${names} is given more than once. Use -n for several images from one model.`);
	}

	if (modelIds.length < 2) {
		throw new ValidationError("compare needs at least two models: pass -m two or more times.");
	}
}

/**
 * Works out the comparison's folder.
 *
 * @param output - The `-o` value, if any.
 * @param cwd - The current working directory.
 * @param folderName - The folder's name, like `2026-10-15_a-lighthouse`.
 * @returns The folder's absolute path.
 * @throws {ValidationError} When `-o` is `-` or names an image file.
 */
export function getCompareDirectory(output: string | undefined, cwd: string, folderName: string): string {
	if (output === "-") {
		throw new ValidationError(
			"compare writes a folder of images, so it can't write to stdout. Pass -o <dir> instead.",
		);
	}

	if (output !== undefined && getImageTypeFromPath(output) !== undefined) {
		throw new ValidationError(`compare's -o takes a directory, but ${output} looks like an image file.`);
	}

	return nodePath.join(nodePath.resolve(cwd, output ?? "."), folderName);
}

/**
 * Decides what one Ctrl-C does across several runs at once. Saving wins over
 * aborting, and aborting over exiting, so an interrupt never drops an image
 * that is being written.
 *
 * @param actions - What each run's guard asked for.
 * @returns What to do.
 */
export function combineInterruptActions(actions: ReadonlyArray<InterruptAction>): InterruptAction {
	if (actions.includes(InterruptAction.Defer)) return InterruptAction.Defer;
	if (actions.includes(InterruptAction.Abort)) return InterruptAction.Abort;

	return InterruptAction.Exit;
}

/**
 * Adds up the estimates of every model.
 *
 * @param estimates - Each model's estimate, or `undefined` when unknown.
 * @returns Like `$0.03`, `≈ $0.03`, or `≥ $0.03` when some are unknown.
 */
export function describeTotalCost(estimates: ReadonlyArray<CostEstimate | undefined>): string {
	let usd = 0;
	let isApproximate = false;
	let hasUnknown = false;
	for (const estimate of estimates) {
		if (estimate === undefined) {
			hasUnknown = true;
			continue;
		}

		usd += estimate.usd;
		isApproximate ||= estimate.isApproximate;
	}

	const text = describeEstimate({ isApproximate, provider: "", usd }, []);
	return hasUnknown ? `≥ ${text.replace("≈ ", "")}` : text;
}

/**
 * Keeps every model that validated, or fails with every model's problem at
 * once, so nothing is spent until the whole comparison is valid.
 *
 * @template Prepared - A validated request.
 * @param settled - Each model's validation, in `-m` order.
 * @returns The validated requests, in the same order.
 * @throws {ValidationError} Listing each model's problem, one per line.
 * @throws {Error} Any other error as is, such as a missing API key.
 */
export function collectPrepared<Prepared>(settled: ReadonlyArray<PromiseSettledResult<Prepared>>): Array<Prepared> {
	const problems: Array<string> = [];
	const prepared: Array<Prepared> = [];
	for (const outcome of settled) {
		if (outcome.status === "fulfilled") {
			prepared.push(outcome.value);
		} else if (outcome.reason instanceof ValidationError) {
			problems.push(outcome.reason.message);
		} else {
			throw outcome.reason;
		}
	}

	if (problems.length > 0) {
		throw new ValidationError(problems.join("\n"));
	}

	return prepared;
}

export interface SpendContext {
	readonly isDryRun: boolean;
	/** Whether stdin and stderr are both terminals, so darkroom can ask. */
	readonly isTerminal: boolean;
	/** `--yes`. */
	readonly skipConfirmation: boolean;
}

/**
 * Refuses to spend without consent: off a terminal, `--yes` is the consent.
 *
 * @param context - Whether this is a dry run, a terminal, or `--yes`.
 * @param context.isDryRun - Nothing will be sent.
 * @param context.isTerminal - Darkroom can ask.
 * @param context.skipConfirmation - `--yes` was passed.
 * @throws {ValidationError} When money would be spent without asking.
 */
export function checkCanSpend({ isDryRun, isTerminal, skipConfirmation }: SpendContext): void {
	if (isTerminal || isDryRun || skipConfirmation) return;

	throw new ValidationError("compare asks before spending; pass --yes when not running in a terminal.");
}
